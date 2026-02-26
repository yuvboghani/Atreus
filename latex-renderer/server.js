const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.text({ type: '*/*' })); // Fallback for simple text

app.post('/render', (req, res) => {
    // Handle both JSON (complex) and text (simple)
    let masterTex = '';
    let tailoredTex = '';

    if (req.is('application/json')) {
        masterTex = req.body.master;
        tailoredTex = req.body.tailored;
    } else {
        // Legacy support or simple text
        tailoredTex = req.body;
    }

    if (!tailoredTex) {
        return res.status(400).send('No LaTeX source provided');
    }

    const timestamp = Date.now();
    const workDir = '/app/temp';
    const id = `doc_${timestamp}_${Math.random().toString(36).substring(7)}`;

    const tailoredFile = path.join(workDir, `${id}_tailored.tex`);
    const masterFile = path.join(workDir, `${id}_master.tex`);
    const diffFile = path.join(workDir, `${id}_diff.tex`);

    // Ensure temp directory exists
    if (!fs.existsSync(workDir)) {
        fs.mkdirSync(workDir, { recursive: true });
    }

    fs.writeFileSync(tailoredFile, tailoredTex);
    if (masterTex) {
        fs.writeFileSync(masterFile, masterTex);
    }

    const output = {
        clean: null,
        diff: null,
        logs: []
    };

    // Helper to compile
    const compile = (file, label) => {
        return new Promise((resolve) => {
            const cmd = `pdflatex -interaction=nonstopmode -output-directory=${workDir} ${file}`;
            exec(cmd, (error, stdout, stderr) => {
                const pdfPath = file.replace('.tex', '.pdf');
                const logPath = file.replace('.tex', '.log');

                if (fs.existsSync(logPath)) {
                    output.logs.push(`${label} LOG:\n${fs.readFileSync(logPath, 'utf8')}`);
                }

                if (!error && fs.existsSync(pdfPath)) {
                    resolve(fs.readFileSync(pdfPath).toString('base64'));
                } else {
                    console.error(`${label} compilation failed:`, stderr || stdout);
                    resolve(null);
                }
            });
        });
    };

    // Run compilations
    (async () => {
        // 1. Compile Tailored (Clean)
        output.clean = await compile(tailoredFile, 'CLEAN');

        // 2. Generate and Compile Diff (if master provided)
        if (masterTex && output.clean) {
            await new Promise((resolve) => {
                // latexdiff
                const cmd = `latexdiff ${masterFile} ${tailoredFile} > ${diffFile}`;
                exec(cmd, (error, stdout, stderr) => {
                    if (error) {
                        console.error('latexdiff failed:', stderr);
                        output.logs.push(`LATEXDIFF ERROR:\n${stderr}`);
                        resolve();
                    } else {
                        resolve();
                    }
                });
            });

            if (fs.existsSync(diffFile)) {
                output.diff = await compile(diffFile, 'DIFF');
            }
        }

        // Cleanup
        try {
            const files = fs.readdirSync(workDir);
            for (const file of files) {
                if (file.startsWith(id)) {
                    fs.unlinkSync(path.join(workDir, file));
                }
            }
        } catch (e) {
            console.error('Cleanup error:', e);
        }

        // Return
        if (output.clean) {
            res.json(output);
        } else {
            res.status(500).json({ error: 'Compilation failed', logs: output.logs });
        }

    })();
});

app.listen(port, () => {
    console.log(`LaTeX renderer listening on port ${port}`);
});
