import http from 'http';
import fs from 'fs';
import url from 'url';
import mime from 'mime';
import { networkInterfaces } from 'os';

// SERVER CONFIGURATION
// --------------------
// Directory to server files from (absolute path), ends in a \\
let tempStoragePath = process.argv[2] || process.cwd();
if (!tempStoragePath.endsWith('\\')) {
    tempStoragePath += '\\';
}
const storagePath = tempStoragePath;

// Port server listens on
const port = 8084;
// Specific files to block, eg "H:/Jesse's art/icons/android/convert.bat"
// Must be exact filenames, and must be an absolute path.
let blocklist = [];
// Filters for files to block, eg ".bat" will block all files containing ".bat"
// If the path includes any of the filter strings, it will be blocked.
let filterlist = [];

// CSS applied all pages
const pageStyles = `<style>${fs.readFileSync('./style.css')}</style>`;

const streamVideoOrFile = function(videoPath, req, res) {
    const mimeType = mime.getType(req.url) || "application/octet-stream";
    const range = req.headers.range;

    // Get video stats
    const videoSize = fs.statSync(videoPath).size;

    const commonHeaders = {
        'Content-Type': mimeType,
    }
    if (mimeType === "application/octet-stream") {
        // Make unknown files a download
        commonHeaders['Content-Disposition'] = 'attatchment';
    }

    if (!range) {
        // No range header: serve entire video
        const headers = {
            ...commonHeaders,
            'Content-Length': videoSize,
        };

        res.writeHead(200, headers);
        fs.createReadStream(videoPath).pipe(res);
    } else {
        // Range header present: serve requested part of the video
        const CHUNK_SIZE = 10 ** 6; // 1MB
        const start = Number(range.replace(/\D/g, ''));
        const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

        const contentLength = end - start + 1;
        const headers = {
            ...commonHeaders,
            'Content-Range': `bytes ${start}-${end}/${videoSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': contentLength
        };

        res.writeHead(206, headers);
        fs.createReadStream(videoPath, { start, end }).pipe(res);
    }
}

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
            const mimeType = mime.getType(req.url) || "application/octet-stream";

            if (mimeType?.startsWith('video')) {
                streamVideoOrFile(reqPath, req, res);
                return;
            }

            fs.readFile(reqPath, function (err,data) {
                if (err) {
                    if (err.code === 'ERR_FS_FILE_TOO_LARGE') {
                        streamVideoOrFile(reqPath, req, res);
                        return;
                    }

                    res.setHeader("Content-Type", "text/plain");
                    res.end("An error occurred: " + err.code);
                    console.error(err);
                    return;
                }
                res.setHeader("Content-Type", mimeType);
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
            
                let dirs_HTML = `<h1>
                        Directory <path><a class="short" href="/simplefile/E/">sf/</a>${parentDirectory}</path>
                    </h1>
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
                        const trimStartLen = 35;
                        const trimEndLen = 9;
                        const maxFilenameLen = trimStartLen + trimEndLen + 5; // 5 = ' ... '
                        const begin = file.substring(0, trimStartLen);
                        const end = file.substring(file.length - trimEndLen);

                        let truncatedName = (file.length > maxFilenameLen) ? (begin + ' ... ' + end) : (file);
            
                        files_HTML += `<span><a class="list" href="${href}" title="${file}">${truncatedName}
                            <span class="modified-date">${first_file ? 'Modified' : ''} ${modifiedDate}</span>`;
            
                        first_file = false;
            
                        if (/\.(png|svg|jpg|jpeg)$/.test(file)) {
                            files_HTML += ` <img src="${href}" class="preview">`;
                        }
            
                        // close file <a>, add download link, close line <span>
                        files_HTML += `</a> <a class="side-download" href=${href}?download=true>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-file-earmark-arrow-down" viewBox="0 0 16 16">
                                <path d="M8.5 6.5a.5.5 0 0 0-1 0v3.793L6.354 9.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 10.293z"/>
                                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                            </svg>
                        </a></span>`;
                    } else {
                        dirs_HTML += `<span><a class="list" href="/simplefile/E/${parentDirectory}/${file}">${file}
                            <span class="modified-date">${first_dir ? 'Modified' : ''} ${modifiedDate}</span>
                        </a></span>`;
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
console.log("Serving files from " + storagePath);


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
