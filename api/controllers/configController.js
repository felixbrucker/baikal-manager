'use strict';

const https = require('https');
const http = require('http');
var colors = require('colors/safe');


var configModule = require(__basedir + 'api/modules/configModule');
var statsController = require(__basedir + 'api/controllers/statsController');

var prevAlgos={};
var profitTimer=null;
var perDeviceConfig={};

Array.prototype.contains = function(element){
  return this.indexOf(element) > -1;
};

function getConfig(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(configModule.getConfig()));
}
function setConfig(req, res, next) {
  var prev=JSON.parse(JSON.stringify(configModule.config.statsEnabled));
  configModule.setConfig(req.body);
  if (prev!==req.body.statsEnabled)
    statsController.restartInterval();
  configModule.saveConfig();
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({result: true}));
}

function update(req, res, next) {
  const spawn = require('cross-spawn');
  const child = spawn('git',['pull'],{
      detached: true,
      stdio: 'ignore',
      shell:true
    });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({result:true}));
}

function getAlgoForGroup(group){ //group is expected to be autoswitch-enabled
  var query={
    algos:{},
    region:group.region,
    name:group.name
  };

  //setup algos for group
  for(var i=0;i< configModule.config.entries.length;i++) {
    var entry = configModule.config.entries[i];
    if(entry.enabled&&entry.group===group.name){
      query.algos[entry.algo]={hashrate:0};
    }
  }

  //add hashrates of group devices
  for(var j=0;j< configModule.config.devices.length;j++) {
    var device = configModule.config.devices[j];
    if (device.enabled&&device.groups.contains(group.name)){
      for (var property in query.algos) {
        if (query.algos.hasOwnProperty(property)) {
          query.algos[property].hashrate+=device.hashrate;
        }
      }
    }
  }

  //multiply to get H/s for query
  for (var property in query.algos) {
    if (query.algos.hasOwnProperty(property)) {
      query.algos[property].hashrate*=1000*1000;
    }
  }

  //query optimal algo
  var arr = configModule.config.profitabilityServiceUrl.split(":");
  var req= http.request({
    host: arr[0],
    path: '/api/query',
    method: 'POST',
    port: arr[1],
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  }, function (response) {
    response.setEncoding('utf8');
    var body = '';
    response.on('data', function (d) {
      body += d;
    });
    response.on('end', function () {
      var parsed = null;
      try{
        parsed=JSON.parse(body);
      }catch(error){
        console.log(colors.red("["+group.name+"] Error: Unable to get profitability data"));
        console.log(error);
      }
      if (parsed != null){
        if (parsed.result!==false){

          var minerQuery={
            pools:[]
          };

          for(var i=0;i< configModule.config.entries.length;i++) {
            var entry = configModule.config.entries[i];
            if(entry.enabled&&entry.group===group.name&&entry.algo===parsed.result.algo){
              if(entry.appendWorker)
                minerQuery.pools.push({url:entry.stratum,user:entry.username+".#APPEND#",pass:entry.password,priority:entry.prio,algo:entry.algo,extranonce:true});
              else
                minerQuery.pools.push({url:entry.stratum,user:entry.username,pass:entry.password,priority:entry.prio,algo:entry.algo,extranonce:true});
            }
          }

          if(prevAlgos[group.name]!==undefined){
            if(prevAlgos[group.name]!==parsed.result.algo){
              //set device to deploy new config
              for(var j=0;j< configModule.config.devices.length;j++) {
                var device = configModule.config.devices[j];
                if (device.enabled&&device.groups.contains(group.name)){
                  if (perDeviceConfig[device.id]===undefined)
                    perDeviceConfig[device.id]={deploy:false};
                  perDeviceConfig[device.id].deploy=true;
                  if(perDeviceConfig[device.id].minerQuery===undefined)
                    perDeviceConfig[device.id].minerQuery=JSON.parse(JSON.stringify(minerQuery));
                  else
                    perDeviceConfig[device.id].minerQuery.pools=perDeviceConfig[device.id].minerQuery.pools.concat(minerQuery.pools);
                }
              }
              prevAlgos[group.name]=parsed.result.algo;
            }
          }else{
            //startup
            for(var j=0;j< configModule.config.devices.length;j++) {
              var device = configModule.config.devices[j];
              if (device.enabled&&device.groups.contains(group.name)){
                if (perDeviceConfig[device.id]===undefined)
                  perDeviceConfig[device.id]={deploy:false};
                perDeviceConfig[device.id].deploy=true;
                if(perDeviceConfig[device.id].minerQuery===undefined)
                  perDeviceConfig[device.id].minerQuery=JSON.parse(JSON.stringify(minerQuery));
                else{
                  perDeviceConfig[device.id].minerQuery.pools=perDeviceConfig[device.id].minerQuery.pools.concat(minerQuery.pools);
                }

              }
            }
            prevAlgos[group.name]=parsed.result.algo;
          }

        }
      }else
        console.log(colors.red("["+group.name+"] Error: malformed profitability request"));
    });
  }).on("error", function(error) {
    console.log(colors.red("["+group.name+"] Error: Unable to get profitability data"));
    console.log(error);
  });
  req.write(JSON.stringify(query));
  req.end();
}

function deployAll(forceDeploy){
  perDeviceConfig={};
  if(configModule.config.groups!==undefined){
    for(var i=0;i< configModule.config.groups.length;i++) {
      var group = configModule.config.groups[i];
      (function (group){
        if (group.enabled){
          if (group.autoswitch){
            if(configModule.config.profitabilityServiceUrl!==""&&configModule.config.profitabilityServiceUrl!==null&&configModule.config.profitabilityServiceUrl!==undefined){
              getAlgoForGroup(group);
            }else{
              console.log(colors.red("Error: profitability url not configured"));
            }
          }else{
            var query={
              pools:[]
            };
            for(var j=0;j< configModule.config.entries.length;j++) {
              var entry = configModule.config.entries[j];
              if (entry.enabled&&entry.group===group.name){
                if(entry.appendWorker)
                  query.pools.push({url:entry.stratum,user:entry.username+".#APPEND#",pass:entry.password,priority:entry.prio,algo:entry.algo,extranonce:true});
                else
                  query.pools.push({url:entry.stratum,user:entry.username,pass:entry.password,priority:entry.prio,algo:entry.algo,extranonce:true});
              }
            }


            for(var j=0;j< configModule.config.devices.length;j++) {
              var device = configModule.config.devices[j];
              if (device.enabled&&device.groups.contains(group.name)){
                if (perDeviceConfig[device.id]===undefined)
                  perDeviceConfig[device.id]={deploy:false};
                if(forceDeploy)
                  perDeviceConfig[device.id].deploy=true;
                if(perDeviceConfig[device.id].minerQuery===undefined)
                  perDeviceConfig[device.id].minerQuery=JSON.parse(JSON.stringify(query));
                else
                  perDeviceConfig[device.id].minerQuery.pools=perDeviceConfig[device.id].minerQuery.pools.concat(query.pools);
              }
            }
          }
        }
      })(group);
    }

    //wait 2sec till deploy so profit stuff gets loaded fully #ugly
    setTimeout(function(){
      for(var j=0;j< configModule.config.devices.length;j++) {
        var device = configModule.config.devices[j];
        if (device.enabled&&perDeviceConfig[device.id]!==undefined&&perDeviceConfig[device.id].deploy){
          (function(device,minerQuery){
            deployConfigToMiner(device,JSON.parse(JSON.stringify(minerQuery)));
          })(device,perDeviceConfig[device.id].minerQuery);
        }
      }
    },2000);

  }
}

function deploy(req,res,next){
  prevAlgos={};
  if(profitTimer!==null)
    clearInterval(profitTimer);
  deployAll(true);
  profitTimer=setInterval(function(){
    deployAll(false);
  },1000*60*configModule.config.autoswitchInterval);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({result:true}));
}

function deployConfigToMiner(device,query){
  for(var i=0;i<query.pools.length;i++){
    query.pools[i].user=query.pools[i].user.replace("#APPEND#",device.name);
  }
  var arr = device.hostname.split(":");
  switch(device.protocol){
    case "http":
      var req= http.request({
        host: arr[0],
        path: '/f_settings.php?pools='+encodeURIComponent(JSON.stringify(query.pools)),
        method: 'GET',
        port: arr[1],
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }, function (response) {
        response.setEncoding('utf8');
        var body = '';
        response.on('data', function (d) {
          body += d;
        });
        response.on('end', function () {
          //console.log(body);
        });
      }).on("error", function(error) {
        console.log(colors.red("["+device.name+"] Error: Unable to deploy config"));
        console.log(error);
      });
      req.end();
      break;
    case "https":
      var req= https.request({
        host: arr[0],
        path: '/f_settings.php?pools='+encodeURIComponent(JSON.stringify(query.pools)),
        method: 'GET',
        port: arr[1],
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }, function (response) {
        response.setEncoding('utf8');
        var body = '';
        response.on('data', function (d) {
          body += d;
        });
        response.on('end', function () {
          //console.log(body);
        });
      }).on("error", function(error) {
        console.log(colors.red("["+device.name+"] Error: Unable to deploy config"));
        console.log(error);
      });
      req.end();
      break;
  }
}

function init() {
  if(configModule.config.deployOnStartup){
    console.log("deploy on startup enabled...");
    setTimeout(function(){
      deployAll(false);
      if(profitTimer!==null)
        clearInterval(profitTimer);
      profitTimer=setInterval(function(){
        deployAll(false);
      },1000*60*configModule.config.autoswitchInterval);
    },5000);
  }

}

setTimeout(init,1000);


exports.getConfig = getConfig;
exports.setConfig = setConfig;
exports.update = update;
exports.deploy = deploy;
