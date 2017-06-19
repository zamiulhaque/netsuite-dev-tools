var progressBar = require ("progress");
var request = require ("superagent");
var fs = require ('fs');
var path = require('path');

function push (filename, netsuiteConfig) {
    return new Promise (function (resolve, reject) {
        try {
            var barStyle = 'uploading [:bar] :percent :etas';
            var barOptions = {
                total:10
            };
            var bar = new progressBar(barStyle, barOptions);

            var url = netsuiteConfig.url + "?script=" + netsuiteConfig.scriptid + "&deploy=" + netsuiteConfig.deploymentid;
            // console.log("url is " + url);
            var authHeader = "NLAuth nlauth_account=" + netsuiteConfig.account +  ", nlauth_email=" + netsuiteConfig.email + ", nlauth_signature=" + netsuiteConfig.password;
            // console.log("auth header is " + authHeader);
            // var fullFilePath = path.basename(filename);
            fs.readFile(filename, function (err, data) {
                if (err) {
                    resolve({"status":false,"message":JSON.stringify(err)});
                    console.log(err);
                }
                request
                    .put(url)
                    .set('Authorization', authHeader)
                    .send({"name":filename,"path":filename,"content":data.toString()})
                    .end(function (err, res) {
                        if (err) {
                            resolve({"status":false,"message":JSON.stringify(err)}); 
                        }
                        else if (res == undefined) {
                            resolve({"status":false,"message":"File does not exist!"}); 
                        }
                        else {
                            if (res.status != '200') {
                                resolve({"status":false,"message":JSON.stringify(res)}); 
                            }
                            bar.tick(10);
                            resolve({"status":true,"message":null}); 
                        }
                    });
            });
        }
        catch (e) {
            console.log(e);
            resolve({"status":false,"message":JSON.stringify(e)}); 
        }
    });
}

function execute (filename, netsuiteConfig) {
    return new Promise (function (resolve, reject) {
        try {
            var barStyle = 'submitting to queue [:bar] :percent :etas';
            var barOptions = {
                total:10
            };
            var bar = new progressBar(barStyle, barOptions);

            var url = netsuiteConfig.url + "?script=" + netsuiteConfig.scriptid + "&deploy=" + netsuiteConfig.deploymentid;
            // console.log("url is " + url);
            var authHeader = "NLAuth nlauth_account=" + netsuiteConfig.account +  ", nlauth_email=" + netsuiteConfig.email + ", nlauth_signature=" + netsuiteConfig.password;
            // console.log("auth header is " + authHeader);

            request
                .post(url)
                .set('Authorization', authHeader)
                .send({"name":filename})
                .end(function (err, res) {
                    if (err) {
                        resolve({"status":false,"message":JSON.stringify(err)}); 
                    }
                    else if (res == undefined) {
                        resolve({"status":false,"message":"File does not exist!"}); 
                    }
                    else {
                        if (res.status != '200') {
                            resolve({"status":false,"message":JSON.stringify(res)}); 
                        }
                        bar.tick(10);
                        resolve({"status":true,"message":null, "taskId": res.body}); 
                    }
                });
        }
        catch (e) {
            console.log(e);
            resolve({"status":false,"message":JSON.stringify(e)}); 
        }
    });
}

function checkStatus (taskId, netsuiteConfig) {
    return new Promise (function (resolve, reject) {
        try {
            var url = netsuiteConfig.url + "?script=" + netsuiteConfig.scriptid + "&deploy=" + netsuiteConfig.deploymentid;
            // console.log("url is " + url);
            var authHeader = "NLAuth nlauth_account=" + netsuiteConfig.account +  ", nlauth_email=" + netsuiteConfig.email + ", nlauth_signature=" + netsuiteConfig.password;
            // console.log("auth header is " + authHeader);

            request
                .post(url)
                .set('Authorization', authHeader)
                .send({"taskId": taskId, 'mode': 'getTaskStatus'})
                .end(function (err, res) {
                    if (err) {
                        resolve({"status":false,"message":JSON.stringify(err)}); 
                    }
                    else if (res == undefined) {
                        resolve({"status":false,"message":"File does not exist!"}); 
                    }
                    else {
                        if (res.status != '200') {
                            resolve({"status":false,"message":JSON.stringify(res)}); 
                        }
                        resolve({"status":res.text ,"message":null, "taskId": taskId}); 
                    }
                });
        }
        catch (e) {
            console.log(e);
            resolve({"status":false,"message":JSON.stringify(e)}); 
        }
    });
}

function getExecutionLogs(filename, netsuiteConfig) {
    return new Promise (function (resolve, reject) {
        try {
            var url = netsuiteConfig.url + "?script=" + netsuiteConfig.scriptid + "&deploy=" + netsuiteConfig.deploymentid;
            // console.log("url is " + url);
            var authHeader = "NLAuth nlauth_account=" + netsuiteConfig.account +  ", nlauth_email=" + netsuiteConfig.email + ", nlauth_signature=" + netsuiteConfig.password;
            // console.log("auth header is " + authHeader);

            request
                .post(url)
                .set('Authorization', authHeader)
                .send({name: filename, mode: 'getExecutionLog'})
                .end(function (err, res) {
                    if (err) {
                        resolve({"status":false,"message":JSON.stringify(err)}); 
                    }
                    else if (res == undefined) {
                        resolve({"status":false,"message":"File does not exist!"}); 
                    }
                    else {
                        if (res.status != '200') {
                            resolve({"status":false,"message":JSON.stringify(res)}); 
                        }
                        resolve({"status":true,"message":null, "logData": res.body}); 
                    }
                });
        }
        catch (e) {
            console.log(e);
            resolve({"status":false,"message":JSON.stringify(e)}); 
        }
    });
}

function download(filename, netsuiteConfig) {
    return new Promise (function (resolve, reject) {
        try {
            var barStyle = 'downloading [:bar] :percent :etas';
            var barOptions = {
                total:10
            };
            var bar = new progressBar(barStyle, barOptions);

            var url = netsuiteConfig.url + "?script=" + netsuiteConfig.scriptid + "&deploy=" + netsuiteConfig.deploymentid;
            // console.log("url is " + url);
            var authHeader = "NLAuth nlauth_account=" + netsuiteConfig.account +  ", nlauth_email=" + netsuiteConfig.email + ", nlauth_signature=" + netsuiteConfig.password;
            // console.log("auth header is " + authHeader);

            request
                .post(url)
                .set('Authorization', authHeader)
                .send({name : filename, mode : 'getExternalURL' })
                .end(function (err, res) {
                    var fileURL = 'https://system.sandbox.netsuite.com' + res.body;
                    request
                    .get(fileURL)
                    .set('Authorization', authHeader)
                    .set('Content-type', 'text/plain')
                    .end(function (err, res) {
                        console.log('Saving file...');
                        fs.writeFileSync(filename, res.text);
                        console.log('The file has been saved!');
                        if (err) {
                            resolve({"status":false,"message":JSON.stringify(err)}); 
                        }
                        else if (res == undefined) {
                            resolve({"status":false,"message":"File does not exist!"}); 
                        }
                        else {
                            if (res.status != '200') {
                                resolve({"status":false,"message":JSON.stringify(res)}); 
                            }
                            bar.tick(10);
                            resolve({"status":true,"message":null}); 
                        }
                    });
                });
        }
        catch (e) {
            console.log(e);
            resolve({"status":false,"message":JSON.stringify(e)}); 
        }
    });
}

var netsuite = {
    push: push,
    execute: execute,
    download: download,
    checkStatus : checkStatus,
    getExecutionLogs: getExecutionLogs
};

module.exports = netsuite;
