/**
 * @namespace configCtrl
 *
 * @author: Felix Brucker
 * @version: v0.0.1
 *
 * @description
 * handles functionality for the config page
 *
 */
(function () {
    'use strict';

    angular
        .module('app')
        .controller('configCtrl', configController);

    function configController($scope,$interval,$http,$filter) {

        var vm = this;
        vm.config = {
            entries:[],
            protocols:[],
            devices:[],
            groups:[],
            algos:[],
            profitabilityServiceUrl:null,
            deployOnStartup:null,
            autoswitchInterval:null,
            statsEnabled:null
        };
        vm.waiting = null;
        vm.waitingDeploy = null;
        vm.updating=null;

        vm.newDevice={
            id:null,
            enabled:true,
            name:"",
            protocol:"http",
            hostname:"",
            groups:[],
            hashrate:""
        };

        vm.newGroup={
            id:null,
            enabled:true,
            name:"",
            autoswitch:false,
            region:null
        };

        vm.newEntry={
            id:null,
            enabled:true,
            stratum:"",
            username:"",
            password:"",
            prio:null,
            appendWorker:true,
            group:"",
            algorithm:""
        };



        // controller API
        vm.init = init;
        vm.getConfig=getConfig;
        vm.setConfig=setConfig;
        vm.deploy=deploy;
        vm.update=update;
        vm.addDevice=addDevice;
        vm.delDevice=delDevice;
        vm.addGroup=addGroup;
        vm.delGroup=delGroup;
        vm.addEntry=addEntry;
        vm.delEntry=delEntry;



        /**
         * @name init
         * @desc data initialization function
         * @memberOf configCtrl
         */
        function init() {
            angular.element(document).ready(function () {
                vm.getConfig();
            });
        }

        /**
         * @name addDevice
         * @desc add new device to array
         * @memberOf configCtrl
         */
        function addDevice() {
            if (vm.newDevice.name!==""&&vm.newDevice.hostname!==""&&vm.newDevice.groups!==[]&&vm.newDevice.protocol!==""&&vm.newDevice.hashrate!==""){
                //gen unique id
                vm.newDevice.id=Date.now();
                //add to array
                vm.config.devices.push(JSON.parse(JSON.stringify(vm.newDevice)));
                //clear variables
                vm.newDevice={
                    id:null,
                    enabled:true,
                    name:"",
                    protocol:"http",
                    hostname:"",
                    groups:[],
                    hashrate:""
                };
                vm.setConfig();
            }else{
                return false;
            }
        }

        /**
         * @name delDevice
         * @desc delete device from array
         * @memberOf configCtrl
         */
        function delDevice(id) {
            vm.config.devices.forEach(function (entry,index,array) {
                if (entry.id===id){
                    vm.config.devices.splice(index,1);
                }
            });
            vm.setConfig();
        }



        /**
         * @name addGroup
         * @desc add new group to array
         * @memberOf configCtrl
         */
        function addGroup() {
            if (vm.newGroup.name!==""&&vm.newGroup.name!==null){
                //gen unique id
                vm.newGroup.id=Date.now();
                //add to array
                vm.config.groups.push(JSON.parse(JSON.stringify(vm.newGroup)));
                //clear variables
                vm.newGroup={
                    id:null,
                    enabled:true,
                    name:"",
                    autoswitch:false,
                    region:null
                };
                vm.setConfig();
            }
        }


        /**
         * @name delGroup
         * @desc delete group from array
         * @memberOf configCtrl
         */
        function delGroup(id) {
            vm.config.groups.forEach(function (entry,index,array) {
                if (entry.id===id){
                    vm.config.groups.splice(index,1);
                }
            });
            vm.setConfig();
        }

        /**
         * @name addEntry
         * @desc add new entry to array
         * @memberOf configCtrl
         */
        function addEntry() {
            if (vm.newEntry.name!==""&&vm.newEntry.name!==null){
                //gen unique id
                vm.newEntry.id=Date.now();
                //add to array
                vm.config.entries.push(JSON.parse(JSON.stringify(vm.newEntry)));
                //clear variables
                vm.newEntry={
                    id:null,
                    enabled:true,
                    stratum:"",
                    username:"",
                    password:"",
                    prio:null,
                    appendWorker:true,
                    group:"",
                    algorithm:""
                };
                vm.setConfig();
            }
        }

        /**
         * @name delEntry
         * @desc delete entry from array
         * @memberOf configCtrl
         */
        function delEntry(id) {
            vm.config.entries.forEach(function (entry,index,array) {
                if (entry.id===id){
                    vm.config.entries.splice(index,1);
                }
            });
            vm.setConfig();
        }



        /**
         * @name getConfig
         * @desc get the config
         * @memberOf configCtrl
         */
        function getConfig() {
            return $http({
                method: 'GET',
                url: 'api/config'
            }).then(function successCallback(response) {
                vm.config.entries=response.data.entries;
                vm.config.protocols=response.data.protocols;
                vm.config.devices=response.data.devices;
                vm.config.groups=response.data.groups;
                vm.config.algos=response.data.algos;
                vm.config.regions=response.data.regions;
                vm.config.profitabilityServiceUrl=response.data.profitabilityServiceUrl;
                vm.config.deployOnStartup=response.data.deployOnStartup;
                vm.config.autoswitchInterval=response.data.autoswitchInterval;
                vm.config.statsEnabled=response.data.statsEnabled;
                vm.config.devices = $filter('orderBy')(vm.config.devices, 'name');
                vm.config.groups = $filter('orderBy')(vm.config.groups, 'name');
                vm.config.entries = $filter('orderBy')(vm.config.entries, ['group','prio']);
            }, function errorCallback(response) {
                console.log(response);
            });
        }


        /**
         * @name setConfig
         * @desc set the config
         * @memberOf configCtrl
         */
        function setConfig() {
            vm.waiting=true;
            return $http({
                method: 'POST',
                url: 'api/config',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8'
                },
                data: vm.config
            }).then(function successCallback(response) {
                setTimeout(function(){vm.waiting = false;},500);
            }, function errorCallback(response) {
                console.log(response);
            });
        }

        /**
         * @name deploy
         * @desc deploy the pools
         * @memberOf configCtrl
         */
        function deploy() {
            vm.waitingDeploy=true;
            return $http({
                method: 'GET',
                url: 'api/config/deploy',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8'
                }
            }).then(function successCallback(response) {
                setTimeout(function(){vm.waitingDeploy = false;},500);
            }, function errorCallback(response) {
                console.log(response);
            });
        }

        /**
         * @name update
         * @desc updates the project from git
         * @memberOf configCtrl
         */
        function update() {
            vm.updating=true;
            return $http({
                method: 'POST',
                url: 'api/config/update',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8'
                }
            }).then(function successCallback(response) {
                setTimeout(function(){vm.updating = false;},500);
            }, function errorCallback(response) {
                console.log(response);
            });
        }




        // call init function on firstload
        vm.init();

    }

})();
