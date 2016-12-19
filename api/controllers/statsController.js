'use strict';

const https = require('https');
const http = require('http');
var fs = require('fs');
var path = require('path');
var colors = require('colors/safe');


var configModule = require(__basedir + 'api/modules/configModule');

var stats = {
  entries:{}
};

function getStats(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(stats));
}


function getMinerStats(device) {
  var arr = device.hostname.split(":");
  switch(device.protocol){
    case "http":
      var req= http.request({
        host: arr[0],
        path: '/f_status.php?all=1',
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
          var parsed = null;
          try{
            parsed=JSON.parse(body);
          }catch(error){
            console.log(colors.red("["+device.name+"] Error: Unable to get stats data"));
            console.log(error);
          }
          if (parsed != null){
            if (parsed.status!==false){
              parsed.status.name=device.name;
              stats.entries[device.id]=parsed.status;
            }
          }
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
        path: '/f_status.php?all=1',
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
          var parsed = null;
          try{
            parsed=JSON.parse(body);
          }catch(error){
            console.log(colors.red("["+device.name+"] Error: Unable to get stats data"));
            console.log(error);
          }
          if (parsed != null){
            if (parsed.status!==false){
              parsed.status.name=device.name;
              stats.entries[device.id]=parsed.status;
            }
          }
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
  setInterval(function(){
    for(var i=0;i<configModule.config.devices.length;i++){
      var device=configModule.config.devices[i];
      (function(device){
          getMinerStats(JSON.parse(JSON.stringify(device)));
      })(device);
    }
  },10000);
}

setTimeout(init, 1000);

exports.getStats = getStats;

