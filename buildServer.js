// Import necessary modules
const express = require('express');
const { exec } = require('child_process');
const path = require('path');

// Initialize the app
const app = express();
const PORT = 3000;

// To prevent multiple builds from running at once
let buildInProgress = false;

// Serve static files (like CSS for better styling)
app.use(express.static('public'));

// Route to render the HTML page with a button
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>CLTMeet Build System</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        background-color: #f5f5f5;
                    }
                    button {
                        padding: 10px 20px;
                        font-size: 18px;
                        background-color: #007bff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                    #output {
                        margin-top: 20px;
                        padding: 10px;
                        background-color: #333;
                        color: white;
                        font-family: monospace;
                        white-space: pre-wrap;
                        overflow-y: scroll;
                        height: 400px;
                    }
                </style>
            </head>
            <body>
                <h1>CLTMeet Build Button</h1>
                <button id="buildButton">Build</button>
                <div id="output"></div>

                <script>
                    const buildButton = document.getElementById('buildButton');
                    const outputDiv = document.getElementById('output');
                    
                    buildButton.addEventListener('click', () => {
                        outputDiv.innerHTML = "Starting build process...\\n";
                        
                        // Make request to start the build
                        fetch('/build')
                        .then(response => response.body.getReader())
                        .then(reader => {
                            const decoder = new TextDecoder();
                            return reader.read().then(function processText({ done, value }) {
                                if (done) return;
                                outputDiv.innerHTML += decoder.decode(value, { stream: true });
                                return reader.read().then(processText);
                            });
                        });
                    });
                </script>
            </body>
        </html>
    `);
});

// Function to execute shell commands and stream logs to the response
function executeCommand(command, res, callback) {
    const process = exec(command, { cwd: path.resolve(__dirname) });

    process.stdout.on('data', (data) => res.write(data));  // Stream stdout
    process.stderr.on('data', (data) => res.write(data));  // Stream stderr
    process.on('exit', (code) => {
        res.write(`Process exited with code ${code}\n`);
        callback();  // Callback to signal the command has finished
    });
}

// API route to handle the build request
app.get('/build', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');

    // Prevent multiple builds from running at once
    if (buildInProgress) {
        return res.end('Build already in progress. Please wait...\n');
    }

    buildInProgress = true;

    const runCommands = async () => {
        try {
            // Pull the latest code from Git
            res.write('Pulling the latest code from Git...\n');
            await new Promise(resolve => executeCommand('git pull', res, resolve));

            // Run npm install
            res.write('Running npm install...\n');
            await new Promise(resolve => executeCommand('npm install', res, resolve));

            // Run expo prebuild
            res.write('Running expo prebuild...\n');
            await new Promise(resolve => executeCommand('npx expo prebuild', res, resolve));

            // Run deploy.sh
            res.write('Running deploy.sh...\n');
            await new Promise(resolve => executeCommand('./deploy.sh', res, resolve));

            res.end('Build process complete.\n');
        } catch (error) {
            res.end(`Error occurred: ${error.message}\n`);
        } finally {
            buildInProgress = false;  // Allow future builds once complete
        }
    };

    runCommands();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
