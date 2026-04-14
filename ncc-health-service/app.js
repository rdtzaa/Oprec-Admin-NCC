const express = require('express');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 8080;

const formatUptime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
};

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: '200 OK - System is running smoothly',
        data: {
            service_uptime: formatUptime(process.uptime()),
            server_time: new Date().toISOString(),
            memory_usage: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
            os_platform: `${os.type()} ${os.release()} (${os.arch()})`
        }
    });
});

app.listen(PORT, () => console.log(`Health service berjalan di port ${PORT}`));