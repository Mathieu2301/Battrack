const si = require('systeminformation');
const sqlite = require('sqlite3');
const fs = require('fs');

const db = new sqlite.Database('./data.db');
db.run('CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT, value TEXT, timestamp INTEGER)');

function cleanDB() {
  db.run(
    'DELETE FROM events WHERE event = "voltage" AND timestamp < ?',
    [Math.round(Date.now() / 1000) - 86400],
  );
}

function logEvent(event, value, time = Date.now()) {
  const req = db.prepare('INSERT INTO events (event, value, timestamp) VALUES (?, ?, ?)');
  req.run([event, value, Math.round(time / 1000)]);
}

function getBattery() {
  si.battery((data) => {
    const lastTimestamp = parseInt(fs.readFileSync('./last', { encoding: 'utf8' }), 10);

    if (Date.now() - lastTimestamp > 60000) {
      if (fs.existsSync('./last')) {
        logEvent('status', 0, lastTimestamp);
      }

      logEvent('status', 1);
    }

    Object.keys(data).forEach((e) => {
      db.get('SELECT value FROM events WHERE event = ? ORDER BY id DESC LIMIT 1', [e], (err, row) => {
        if (err) console.error('Error', err.message);
        else if (!row || row.value != data[e]) logEvent(e, data[e]);
      });
    });

    cleanDB();
  });

  fs.writeFileSync('./last', Date.now().toString(), { encoding: 'utf8' });
}

getBattery();
setInterval(getBattery, 60000);
