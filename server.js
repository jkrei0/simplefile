const http  = require('http');
const fs    = require('fs');
const url   = require('url');
const { networkInterfaces } = require('os');

// SERVER CONFIGURATION
// --------------------
// Directory to server files from (absolute path)
const storagePath = "H:/Jesse's art/icons/android/";

// Port server listens on
const port = 8084;
// Specific files to block, eg "H:/Jesse's art/icons/android/convert.bat"
// Must be exact filenames, and must be an absolute path.
let blocklist = [];
// Filters for files to block, eg ".bat" will block all files containing ".bat"
// If the path includes any of the filter strings, it will be blocked.
let filterlist = [];

// CSS applied all pages
const pageStyles = `<style>
* {
    font-family: sans-serif;
    box-sizing: border-box;
}
form {
    padding-top: 20px;
}
code {
    font-family: monospace;
}
path, path > a {
    font-family: monospace;
    font-size: 1em;
    border-left: 0;
}
path > a {
    padding: 4px;
    border-bottom: 4px solid;
}
details {
    display: flex;
    flex-direction: column;
}
a:not(.short) {
    display: flex;
}
a, button {
    flex-direction: row;
    align-items: center;
    color: #efe;
    text-decoration: none;
    padding: 10px 12px;
    margin-inline: 2px;
    border-radius: 0px;
    border: none;
    border-left: 4px solid #4888;
    font-size: 16px;
    width: 800px;
    max-width: 95%;
    font-family: sans-serif;
    background: transparent;
    cursor: pointer;
    text-align: left;
}
button {
    display: flex;
    flex-direction: row;
    padding: 0px;
    align-items: center;
    padding-right: 14px;
    width: unset;
    border-color: #777;
    background: #333;
}
button > svg {
    height: 2em;
    padding: 5px;
    padding-left: 1px;
    margin-right: 10px;
    background: #777;
    color: white;
}
a > svg.bi {
    height: 1em;
    margin-right: 0.5em;
}
a:not(:hover):nth-child(even) {
    background: #282828;
}
a.list {
    display: inline-flex;
    justify-content: space-between;
    align-items: flex-start;
}
a:hover {
    background: #244;
}
button:hover {
    background: #555;
}
a:visited:hover {
    background: #434;
}
a:visited {
    border-color: #868f;
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
.modified-date {
    margin-left: auto;
    padding-inline: 15px;
    font-size: 0.8em;
    opacity: 0.8;
}
</style>`;

const listener = function (req, res) {
    if (req.url === "/" || req.url == "/home" || req.url == "/index") {
        req.url = "/index.html";
    }
    if (req.url.startsWith("/simplefile/E/") || req.url.startsWith("simplefile/E/")) {
        const parsedUrl = url.parse(req.url, true);
        let parsedUrlPath = parsedUrl.pathname;
        parsedUrlPath = parsedUrlPath.replace(/\/\.\.\//g, "//").replace(/\/\.\.\//g, "/");
        parsedUrlPath = parsedUrlPath.replace(/\/\//g, "/").replace(/\/\//g, "/").replace(/\/\//g, "/");

        let reqPath = storagePath + parsedUrlPath.replace("/simplefile/E/", "").replace(/%20/g, " ");
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
            isFile = null;
        }
        if (isFile === null) {
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
                    console.error(err);
                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end("Not Found.");
                    return;
                }
            
                const parentDirectory = reqPath.replace(storagePath, "");
            
                let head_HTML = `<head>
                    <title>SimpleFile ${parentDirectory}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    ${pageStyles}
                </head>`;
            
                let dirs_HTML = `<h1>Directory <path><a class="short" href="/simplefile/E/">sf/</a>${parentDirectory}</path></h1>
                    <details open><summary>Subdirectories</summary>
                    <a href="${reqPath.replace(storagePath, "/simplefile/E/").replace(/\/[^\/]*\/?$/g, "/")}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
                        </svg>
                        <b>up one directory</b>
                    </a><br><br>`;
            
                let files_HTML = "</details><details open><summary>Files</summary>";
            
                let sortByName = true; // Default sort by name
            
                if (parsedUrl.query.sort === "modified") {
                    sortByName = false;
                }
            
                let sortedFiles = files.map(function(file) {
                    const filePath = `${reqPath}/${file}`;
                    const fileStat = fs.statSync(filePath);
                    return {
                        name: file,
                        modifiedTime: fileStat.mtime.getTime()
                    };
                });
            
                if (sortByName) {
                    sortedFiles.sort(function(a, b) {
                        return a.name.localeCompare(b.name);
                    });
                } else {
                    sortedFiles.sort(function(a, b) {
                        return a.modifiedTime - b.modifiedTime;
                    });
                }
            
                let first_file = true;
                let first_dir = true;
            
                sortedFiles.forEach(function(fileData) {
                    const file = fileData.name;
                    let isSubFile;
                    try {
                        isSubFile = fs.statSync(`${reqPath}/${file}`).isFile();
                    } catch {
                        isSubFile = null; // Set to null to indicate an error
                    }

                    const filePath = `${reqPath}/${file}`;
                    const href = `/simplefile/E/${parentDirectory}/${file}`;
                    const fileStat = fs.statSync(filePath);
                    const modifiedDate = fileStat.mtime.toLocaleString();
            
                    if (isSubFile === null) {
                        files_HTML += `<a class="list">Nonexistent File</a>`;
                    } else if (isSubFile) {
                        let truncatedName = file.length > 45 ? file.substring(0, 42) + "..." : file;
            
                        files_HTML += `<a class="list" href="${href}" title="${file}">${truncatedName}
                            <span class="modified-date">${first_file ? 'Modified' : ''} ${modifiedDate}</span>`;
            
                        first_file = false;
            
                        if (/\.(png|svg|jpg|jpeg)$/.test(file)) {
                            files_HTML += ` <img src="${href}" class="preview">`;
                        }
            
                        files_HTML += ` </a>`;
                    } else {
                        dirs_HTML += `<a class="list" href="/simplefile/E/${parentDirectory}/${file}">${file}
                            <span class="modified-date">${first_dir ? 'Modified' : ''} ${modifiedDate}</span>
                        </a>`;
                        first_dir = false;
                    }
                });
            
                let sortButtonHTML = `<form action="${req.url}" method="GET" style="margin-top: 10px;">
                    <input type="hidden" name="sort" value="${sortByName ? 'modified' : 'name'}">
                    <button type="submit">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-filter" viewBox="0 0 16 16">
                            <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                        </svg>
                        Sort by ${sortByName? 'date modified' : 'name'}
                    </button>
                    </form>`;

                let end_HTML = "</details>";

                res.setHeader("Content-Type", "text/html");
                res.writeHead(200);
                res.end(head_HTML + sortButtonHTML + dirs_HTML + sortButtonHTML + files_HTML + end_HTML);
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
server.listen(port);
console.log("SimpleFile server listening on port " + port);


const getIPAddrs = function () {
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

// Print all available IP addresses to connect to the server
const connections = getIPAddrs();
console.log('Available at:');
for (const entry in connections) {
    const address = connections[entry];
    console.log(entry, ':', 'http://' + address + ':' + port);
}
console.log('');
