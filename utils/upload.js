const multer = require('multer');
const path = require('path');

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.sldprt', '.sldasm', '.slddrw', '.dwg', '.dxf']);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext)) {
            return cb(null, true);
        }

        cb(new Error('Only PDF and CAD files are allowed'));
    },
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

module.exports = upload;
