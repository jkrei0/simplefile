const http  = require('http');
const fs    = require('fs');
const { networkInterfaces } = require('os');

let blocklist = [];
let filterlist = [];

let storagePath = "H:/Jesse's art/icons/android/"

const pageStyles = `<style>
* {
    font-family: sans-serif;
}
code {
    font-family: monospace;
}
path {
    font-style: italic;
}
a {
    color: #efe;
    text-decoration: none;
    padding: 7px 10px;
    margin: 2px;
    border-radius: 0px;
    border-bottom: 2px solid #488;
    font-size: 18px;
    width: 400px;
    max-width: 95%;
    font-family: sans-serif;
}
a.list {
    display: inline-flex;
    justify-content: space-between;
    align-items: flex-start;
}
a:hover {
    background: #244;
}
a:visited:hover {
    background: #434;
}
a:visited {
    border-color: #868;
}
a.list > .preview {
    height: 40px;
}
summary {
    font-weight: bold;
    font-size: 24px;
    margin: 10px;
    cursor: pointer;
}
body {
    background: #222;
    color: #eee;
}
</style>`;

const getIPAddr = function () {
    const nets = networkInterfaces();
    const results = Object.create(null); // Or just '{}', an empty object

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
            if (net.family === familyV4Value && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }
    return results;
}

const listener = function (req, res) {
    if (req.url === "/" || req.url == "/home" || req.url == "/index") {
        req.url = "/index.html";
    }
    if (req.url.startsWith("/simplefile/E/") || req.url.startsWith("simplefile/E/")) {
        req.url = req.url.replace(/\/\.\.\//g, "//").replace(/\/\.\.\//g, "/");
        req.url = req.url.replace(/\/\//g, "/").replace(/\/\//g, "/").replace(/\/\//g, "/");
        let reqPath = storagePath + req.url.replace("/simplefile/E/", "").replace(/%20/g, " ");
        console.log(
            req.url.replace('/simplefile/E', 'sf')
            + ' '.repeat(Math.max(1, 60-req.url.length))
            + reqPath
        );
        let flagged = false;
        if (blocklist.indexOf(reqPath) > 0) {
            flagged = true;
        }
        for (item of filterlist) {
            if (reqPath.includes(item)) {
                flagged = true;
            }
        }
        let isFile;
        try {
            isFile = fs.statSync(reqPath).isFile();
        } catch {
            isFile = 3;
        }
        if (isFile === 3) {
            res.setHeader("Content-Type", "text/html");
            res.writeHead(404);
            res.end(`
            <head>
                <title>SimpleFile File Not Found</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <h2>Not Found.</h2>
            <a href="${reqPath.replace(/\/[^\/]*\/?$/g, "/").replace(storagePath, "/simplefile/E/")}">Go Back.</a><br><br>`
            );
            return;
        } else if (isFile) {
            fs.readFile(reqPath, function (err,data) {
                if (err) {
                    res.setHeader("Content-Type", "text/plain");
                    res.end("Not Found.");
                    console.log(err);
                    return;
                }
                if (req.url.endsWith(".js")) {
                    res.setHeader("Content-Type", "application/javascript");
                } else if (req.url.endsWith(".json")) {
                    res.setHeader("Content-Type", "application/json");
                } else if (req.url.endsWith(".css")) {
                    res.setHeader("Content-Type", "text/css");
                } else if (req.url.endsWith(".png")) {
                    res.setHeader("Content-Type", "image/png");
                } else if (req.url.endsWith(".svg")) {
                    res.setHeader("Content-Type", "image/svg+xml");
                } else if (req.url.endsWith(".jpeg") || req.url.endsWith(".jpg")) {
                    res.setHeader("Content-Type", "image/jpeg");
                } else if (req.url.endsWith(".zip")) {
                    res.setHeader("Content-Type", "application/zip");
                } else if (req.url.endsWith(".xml")) {
                    res.setHeader("Content-Type", "application/xml");
                } else if (req.url.endsWith(".ico")) {
                    res.setHeader("Content-Type", "image/vnd.microsoft.icon");
                } else if (req.url.endsWith(".pdf")) {
                    res.setHeader("Content-Type", "application/pdf");
                } else if (req.url.endsWith(".gif")) {
                    res.setHeader("Content-Type", "image/gif");
                } else if (req.url.endsWith(".mp4")) {
                    res.setHeader("Content-Type", "video/mp4");
                } else if (req.url.endsWith(".mpeg")) {
                    res.setHeader("Content-Type", "video/mpeg");
                } else if (req.url.endsWith(".mp3")) {
                    res.setHeader("Content-Type", "audio/mpeg");
                } else if (req.url.endsWith(".wav")) {
                    res.setHeader("Content-Type", "audio/wav");
                } else if (req.url.endsWith(".php")) {
                    res.setHeader("Content-Type", "application/x-httpd-php");
                } else if (req.url.endsWith(".pptx")) {
                    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
                } else if (req.url.endsWith(".ppt")) {
                    res.setHeader("Content-Type", "application/vnd.ms-powerpoint");
                } else if (req.url.endsWith(".tif") || req.url.endsWith(".tiff")) {
                    res.setHeader("Content-Type", "image/tiff");
                } else if (req.url.endsWith(".htm") || req.url.endsWith(".html")) {
                    res.setHeader("Content-Type", "text/html");
                } else{
                    res.setHeader("Content-Type", "application/octet-stream");
                }
                res.writeHead(200);
                res.end(data);
            });
        } else {
            fs.readdir(reqPath, function(err, files) {
                if (err) {
                    res.setHeader("Content-Type", "text/plain");
                    console.log(err);
                    console.log(req.url, reqPath);
                    res.end("Not Found.");
                    return;
                }
                let head_HTML = `
                <head>
                <title>SimpleFile ${reqPath.replace(storagePath, "/")}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${pageStyles}
                </head>
                `;
                let dirs_HTML = `
                <h1>Directory <path><a href="/simplefile/E/">sf /</a>${reqPath.replace(storagePath, "")}</path></h1>
                <details open><summary>Subdirectories</summary>
                <a href="${reqPath.replace(storagePath, "/simplefile/E/").replace(/\/[^\/]*\/?$/g, "/")}">.. up one directory</a><br><br>`;
                let files_HTML = "</details><details open><summary>Files</summary>";
                files.forEach(function(file) {
                    let isSubFile
                    try {
                        isSubFile = fs.statSync(reqPath+"/"+file).isFile();
                    } catch {
                        isSubFile = 3;
                    }
                    if (isSubFile === 3) {
                        files_HTML += `<a class="list">Nonexistent File</a>`;
                    } else if (isSubFile) {
                        const href = reqPath.replace(storagePath, "/simplefile/E/") + "/" + file;
                        files_HTML += `<a class="list" href="${href}">${file} `; // no closing tag, to add the preview in

                        if (file.endsWith('.png') || file.endsWith('.svg')) {
                            files_HTML += `<img src="${href}" class="preview"> </a>`
                        } else {
                            files_HTML +=`</a>`
                        }
                    } else {
                        dirs_HTML += `<a class="list" href="${reqPath.replace(storagePath, "/simplefile/E/")+"/"+file}">${file}</a>`;
                    }
                });
                let end_HTML = "</details>";
                res.setHeader("Content-Type", "text/html");
                res.writeHead(200);
                res.end(head_HTML + dirs_HTML + files_HTML + end_HTML);
            });
        }
    } else {
        console.log(req.url);
        res.writeHead(200);
        res.end(`<head>
                <title>SimpleFile Home</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${pageStyles}
            </head>
            <body>
                <h1>SimpleFile</h1>
                <h3>Node.js simple file server</h3>
                <a href='/simplefile/E/'>Go To Files</a>
                <br><br>
                Node.js / SimpleFile alpha-0
            </body>
        `);
    }
}

const server = http.createServer(listener);
server.listen(8084);
console.log("server listening on localhost:8084");
console.log(getIPAddr());

const prompt = require('prompt-sync')({sigint: true});

/* (()=>{
    while (true) {
        let command = prompt("SimpleFile Server >> ");
        if (command.startsWith("block:add ")) {
            let URL = command.replace("block:add ", "");
            blocklist.push();
            console.log(`Path ${URL} added to blocklist. Make sure it's the full path!`);
        }
        else if (command.startsWith("block:list")) {
            let full_list = "";
            for (item of blocklist) {
                full_list += item + ",";
            }
            console.log("Blocked paths:");
            console.log(full_list);
        }
    }
})(); */