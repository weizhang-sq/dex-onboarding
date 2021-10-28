const express = require('express');
const cors = require('cors');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const home = require('./home');

/* istanbul ignore next */
if (!module.parent) {
  app.use(morgan('dev'));
}

// Enable compression
console.log(' * Set up compression');
app.use(compression());

// Enable All CORS Requests for testing
console.log(' * Set up CORS');
app.use(cors());
io.origins((origin, callback) => {
  callback(null, true);
});

app.use(cookieParser());

// Routing
console.log(' * Set up routing');

// Home
home.setupRouting(app);

/* istanbul ignore next */
if (!module.parent) {
  server.listen(3000);
  console.log(' * Service started on Port 3000');
}

// Handling http server shutdown gracefully
// Run with `pm2 reload <id> --wait-ready`
process.on('SIGINT', () => {
  console.log(' * SIGINT received');
  server.close((err) => {
    console.log(' * Process exiting...');
    process.exit(err ? 1 : 0);
  });
});
