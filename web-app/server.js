const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PYTHON_COMMAND =
    process.env.PYTHON_COMMAND ||
    (process.platform === 'win32' ? 'python' : 'python3');

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.xlsx', '.txt']);
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const CONVERSION_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || true;

const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${extension}`;
        callback(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(extension)) {
            const error = new Error(`Unsupported file type '${extension}'.`);
            error.status = 415;
            return callback(error, false);
        }
        callback(null, true);
    },
});

app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(
    '/api',
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Too many requests. Please try again later.' },
    }),
);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.post('/api/convert', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const originalFilename = req.file.originalname;

    execFile(
        PYTHON_COMMAND,
        ['-m', 'markitdown', filePath],
        {
            timeout: CONVERSION_TIMEOUT_MS,
            maxBuffer: MAX_OUTPUT_SIZE,
        },
        (error, stdout) => {
            fs.unlink(filePath, (unlinkError) => {
                if (unlinkError) {
                    console.error(`Failed to delete temporary file ${filePath}:`, unlinkError);
                }
            });

            if (error) {
                if (error.killed || error.code === 'ETIMEDOUT') {
                    return res.status(504).json({ error: 'File conversion timed out.' });
                }
                return res.status(500).json({ error: 'Failed to convert document.' });
            }

            const sanitizedMarkdown = stdout
                .replace(/<\/?u>/gi, '')
                .replace(/\uFFFD/g, '-');

            return res.status(200).json({
                filename: originalFilename,
                markdown: sanitizedMarkdown,
            });
        },
    );
});

app.use((error, req, res, next) => {
    if (req.file?.path) {
        fs.unlink(req.file.path, () => { });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File exceeds maximum limit of 15MB.' });
    }

    if (error.status === 415) {
        return res.status(415).json({ error: 'Unsupported file type.' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Internal server error.' });
});

const frontendIndex = path.join(__dirname, 'public', 'index.html');
if (fs.existsSync(frontendIndex)) {
    app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
        res.sendFile(frontendIndex);
    });
}

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server listening on http://localhost:${PORT}`);
    });
}

module.exports = { app, MAX_FILE_SIZE };
