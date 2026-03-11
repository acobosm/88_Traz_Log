const fs = require('fs');
const path = require('path');

function log(message) {
    const logDir = path.join(__dirname, '../logs');
    const logFile = path.join(logDir, 'operaciones.log');

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}\n`;

    fs.appendFileSync(logFile, formattedMessage);
    console.log(formattedMessage.trim());
}

// Permitir uso desde CLI: node scripts/logger.js "Mi mensaje"
if (require.main === module) {
    const msg = process.argv.slice(2).join(' ');
    if (msg) {
        log(msg);
    } else {
        console.log("Uso: node scripts/logger.js <mensaje>");
    }
}

module.exports = log;
