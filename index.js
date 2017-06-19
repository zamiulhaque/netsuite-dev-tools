#!/usr/bin/env node
var program = require ("commander");
var chalk = require ("chalk");
var path = require ("path");
var cliFormat = require('cli-format')
var fs = require('fs');
var netsuite = require('./modules/netsuite');
var childProcess = require('child_process');

var configPath = path.dirname(require.resolve('netsuite-dev-tools')) + '/config.json';
var programVersion = require('./package.json').version;

if(!fs.existsSync(configPath)) {
    console.log(chalk.bold.green("A default config file was made with the path below: "));
    console.log(chalk.bold.green(configPath))
    console.log(chalk.bold.blue("\nRun 'netsuite config' to edit it with your default text editor."))
    console.log("");
    createEmptyConfigFile();

}

var netsuiteConfig = unarchiveConfigFile();

function formattedErrorResponseString(errorResponseString) {
    var errorObj = JSON.parse(errorResponseString);
    errorObj.response.text = JSON.parse(errorObj.response.text);
    return JSON.stringify(errorObj, undefined, 2);

}

function formattedJSONString(jsonString) {
    return JSON.stringify(JSON.parse(jsonString), undefined, 2);

}

function createEmptyConfigFile() {
    archiveConfigFile({
        "url": "",
        "email": "",
        "password": "",
        "account": "",
        "scriptid": "",
        "deploymentid": "",
        "logLimit" : 100,
        "statusUpdateFrequency": 2
    
    });

}

function archiveConfigFile(configJSON) {
    var fd = fs.openSync(configPath,'w');
    fs.writeFileSync(configPath, formattedJSONString(configJSON));
    fs.close(fd);

}

function unarchiveConfigFile() {
    return JSON.parse(fs.readFileSync(configPath, 'UTF-8'));

}

function handleExecution(file, config, successCallback) {
    console.log(chalk.blue("Queuing " + file + " for execution on default deployment"));

    netsuite.execute(file, config).then (function (response) {
        if (response.status) {
            console.log(chalk.bold.blue(file + " was successfully deployed for execution"));
            if(successCallback) {
                successCallback(response.taskId)
                
            } else {
                process.exit(0);

            }
        }
        else {
            console.error(chalk.bold.red("Could not queue " + file + " for execution " + formattedErrorResponseString(response.message)));
            process.exit(1);
        }
    }); 

}

function handlePush(file, config, successCallback) {
    console.log(chalk.blue("Pushing " + file + " to netsuite"));
    netsuite.push(file, config).then (function (response) {
        if (response.status) {
            console.log(chalk.bold.blue("Push to netsuite complete"));
            if(successCallback) {
                successCallback()
                
            } else {
                process.exit(0);
                
            }
        }
        else {
            console.error(chalk.bold.red("Failed to push to netsuite: " + formattedErrorResponseString(response.message)));
            process.exit(1);
        }
    }); 

}

function handleDownload(file, config, successCallback) {
    console.log(chalk.blue("Downloading " + file + " from netsuite"));
    netsuite.download(file, config).then (function (response) {
        if (response.status) {
            console.log(chalk.bold.blue("Download complete"));
            if(successCallback) {
                successCallback()
                
            } else {
                process.exit(0);
                
            }
        }
        else {
            console.error(chalk.bold.red("Failed to download from netsuite: " + formattedErrorResponseString(response.message)));
            process.exit(1);
        }
    }); 

}

function handleStatusCheck(taskId, config, previousStatus, completionHandler) {
    netsuite.checkStatus(taskId, config).then (function (response) {
        if (response.status) {

            var coloredStatus = response.status.substring(1, response.status.length - 1);
            if(coloredStatus == "PENDING") {
                coloredStatus = chalk.bold.cyan(coloredStatus);

            } else if(coloredStatus == "PROCESSING") {
                coloredStatus = chalk.bold.yellow(coloredStatus);

            } else if(coloredStatus == "COMPLETE") {
                coloredStatus = chalk.bold.green(coloredStatus);

            } else if(coloredStatus == "FAILED") {
                coloredStatus = chalk.bold.red(coloredStatus);
                
            }

            console.log(chalk.bold.blue("Script Deployment Status at " + getTimeString(new Date()) + ": " + coloredStatus));

            if(response.status == '"COMPLETE"' || response.status == '"FAILED"') {
                console.log("");
                if(completionHandler) {
                    completionHandler();

                } else {
                    process.exit(0);

                }
                
            } else {
                setTimeout(function() { handleStatusCheck(taskId, config, response.status, completionHandler) }, config.statusUpdateFrequency * 1000);

            }
                
        }
        else {
            console.error(chalk.bold.red("Failed to check status of task: " + formattedErrorResponseString(response.message)));
            process.exit(1);
        }
    }); 

}

function handleExecutionLogs(file, config, successCallback) {
    console.log(chalk.blue("Getting logs for " + file + " from netsuite"));
    console.log();
    netsuite.getExecutionLogs(file, config).then (function (response) {
        if (response.status) {
            printLogs(response.logData, config.logLimit);


            console.log(chalk.bold.blue("\nLog acquisition complete"));
            if(successCallback) {
                successCallback()
                
            } else {
                process.exit(0);
                
            }
        }
        else {
            console.error(chalk.bold.red("Failed to acquire logs: " + formattedErrorResponseString(response.message)));
            process.exit(1);
        }
    }); 

}

function printLogs(logData, limit) {
    var parsedLogData = JSON.parse(logData).slice(0,limit).reverse();

    var header1 = {
        content: chalk.bold.yellow("Date"),
        width: 9,
        filler: ' '
    };

    var header2 = {
        content: chalk.bold.yellow("Time"),
        width: 8,
        filler: ' '
    };

    var header3 = {
        content: chalk.bold.yellow("User"),
        width: 15,
        filler: ' '
    };

    var header4 = {
        content: chalk.bold.yellow("Title"),
        width: 15,
        filler: ' '
    };

    var header5 = {
        content: chalk.bold.yellow("Details"),
        filler: ' '
    };

    var config = { paddingMiddle: ' | ' };

    console.log(
        cliFormat.columns.wrap( [header1, header2, header3, header4, header5], config)

    );

    parsedLogData.forEach(function(logItem) {
        var col1 = {
            content: removeLineBreaks(logItem['values']['date']),
            width: 9,
            filler: ' '
        };

        var col2 = {
            content: removeLineBreaks(logItem['values']['time']),
            width: 8,
            filler: ' '
        };

        var col3 = {
            content: removeLineBreaks(logItem['values']['user']),
            width: 15,
            filler: ' '
        };

        var col4 = {
            content: removeLineBreaks(chalk.bold(logItem['values']['title'])),
            width: 15,
            filler: ' '
        };

        var col5 = {
            content: removeLineBreaks(logItem['values']['detail']),
            filler: ' '
        };

        console.log(
            cliFormat.columns.wrap( [col1, col2, col3, col4, col5], config)

        );
    });

}

function removeLineBreaks(string) {
    return string.replace(/(\r\n|\n|\r)/gm,"");

}

function leftZeroPad(number) {
    var string = number + "";
    if(string.length == 1) {
        return "0" + string;

    }
    return string;

}

function getTimeString(date) {
    return leftZeroPad(date.getHours() % 12) + ":" 
            + leftZeroPad(date.getMinutes()) + ":" 
            + leftZeroPad(date.getSeconds()) + " " 
            + ((date.getHours() > 12) ? "PM" : "AM")

}

program
    .version(programVersion)
    .command("script")
    .alias("s")
    .description("Manipulate script file locally or on netsuite server")
    .arguments("<filename>", "File name of script on netsuite server / local environment")
    .option("-u, --upload", "Upload script to netsuite server")
    .option("-d, --download", "Download script from server and save in local environment")
    .option("-x, --execute", "Execute script with default deployment")
    .option("-c, --check-status", "Check status of script execution intermittently until completion")
    .option("-f, --frequency = <n>", "Frequency of task status checks in seconds", parseInt)
    .option("-l, --logs [n]", "Print execution logs with optional limit (default is " + netsuiteConfig.logLimit +")", parseInt)
    .action(function(filename, options) {
        try {

           netsuiteConfig.statusUpdateFrequency = (options.frequency) ? parseInt(options.frequency) : netsuiteConfig.statusUpdateFrequency;
           netsuiteConfig.logLimit = (options.logs) ? parseInt(options.logs) : netsuiteConfig.logLimit;

           if(options.execute && options.push) {
            handlePush(filename, netsuiteConfig, function() { 
                handleExecution(filename, netsuiteConfig, function(taskId) {
                    if(options.logs && !options.checkStatus) {
                        handleExecutionLogs(filename, netsuiteConfig, null);

                    }
                    if(options.checkStatus) {
                        console.log(chalk.blue("Checking status of task with (ID: " + taskId + ") on netsuite\n"));
                        console.log("");
                        handleStatusCheck(taskId, netsuiteConfig, null, function() {
                            if(options.logs) {
                                handleExecutionLogs(filename, netsuiteConfig, null);

                            }

                        })

                    }

                })

            })

           } else if(options.execute) {
            handleExecution(filename, netsuiteConfig, function(taskId) {
                if(options.logs && !options.checkStatus) {
                    handleExecutionLogs(filename, netsuiteConfig, null);

                }
                if(options.checkStatus) {
                    console.log(chalk.blue("\nChecking status of task with (ID: " + taskId + ") on netsuite"));
                    console.log("");
                    handleStatusCheck(taskId, netsuiteConfig, null, function() {
                        if(options.logs) {
                            handleExecutionLogs(filename, netsuiteConfig, null);

                        }

                    })
                }

            });

           } else if(options.download) {
            handleDownload(filename, netsuiteConfig, null);

           } else if(options.push) {
            handlePush(filename, netsuiteConfig, null);

           } else if(options.logs) {
            handleExecutionLogs(filename, netsuiteConfig, null);

           } 
        }
        catch (e) {
            console.error(chalk.bold.red("Something bad happened: " + e));
            process.exit(1);

        }
    });
    
    program
    .command("update")
    .alias("upgrade")
    .alias("up")
    .description("Update dev tools to latest version, preserving current configuration")
    .action(function(env, options) {
        // Unarchive config file
        var configFile = unarchiveConfigFile();

        console.log("Uninstalling previous version: netsuite-dev-tools@"+programVersion);
        // Change working directory to parent folder, in case user is editing netsuite-dev-tools
        process.chdir("../");
        var previousPath = process.cwd();

        childProcess.execSync("npm uninstall -g netsuite-dev-tools");

        console.log("Installing latest version")

        childProcess.execSync("npm install -g netsuite-dev-tools");

        // Change working directory back
        process.chdir(previousPath);

        programVersion = require('./package.json').version
        console.log("Sucessfully installed: netsuite-dev-tools@"+programVersion);

        // Create new config archive
        archiveConfigFile(configFile);

    });

    program
    .command("config")
    .description("Open the current JSON configuration file in your default text editor.")
    // .option("-u, --username = <username>", "Set email address to authenticate with netsuite")
    // .option("-w, --password = <password>", "Set password to authenticate with netsuite")
    // .option("-a, --account = <account>", "Set account ID to authenticate with netsuite")
    // .option("-s, --scriptid = <scriptid>", "Set script ID of restlet in netsuite")
    .action(function(env, options) {
        childProcess.execSync("open "+configPath);

    });

    program.parse(process.argv);
