const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const app = express();
const fs = require('fs');

const { JSDOM } = require( "jsdom" );
const { window } = new JSDOM( "" );
const $ = require( "jquery" )( window );

const formidable = require('express-formidable');
const gemmaDBDestinationPath = __dirname + '/uploadedDB/gemma.db';
let gemmaData = [];
let gemmaDataColumn = [];
let mineName = [];
let wholeDB = [];
let tableName = "TransactionModel";

app.use(formidable());

function initDB() {
  // Open a database connection
  let db = new sqlite3.Database(gemmaDBDestinationPath);

  if (db != null) {
    db.all('SELECT * FROM sqlite_sequence ORDER BY name ASC', [], (err, rows) => {

      if (err) {
        // throw err;
        console.log(err.message);
      } else {
        wholeDB = rows;
      }

    });

    db.all('SELECT * FROM SitesModel LIMIT 1', [], (err, rows) => {
      if (err) {
        // throw err;
        console.log(err.message);
      } else {
        mineName = rows[0];
      }

    });

    db.all('PRAGMA table_info(TransactionModel)', (err, rows) => {
      if (err) {
        console.error(err.message);
      } else {
        gemmaDataColumn = rows;
        // rows.forEach(row => {
        //   console.log(row.name);
        // });
      }
    });


// Execute a SELECT query to read data from a table..
    db.all('SELECT * FROM TransactionModel ORDER BY Id DESC LIMIT 10', (err, rows) => {
      if (err) {
        console.error(err.message);
      } else {
        gemmaData = rows;
      }

    });

    db.close();

  }

}

function queryTableColumnInfoSpecial(tableInfo, selectedColumns) {

  return new Promise((resolve, reject) => {
    let db = new sqlite3.Database(gemmaDBDestinationPath);

    db.all('PRAGMA table_info (' + tableInfo + ')', (err, rows) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        db.close();

        const columnList = selectedColumns.join(',');
        const filteredData = rows.filter(row => columnList.includes(row.name));

        resolve(filteredData);
        // console.log(filteredData);
      }

    });
  })

}

function queryTableColumnInfo(tableInfo) {

  return new Promise((resolve, reject) => {
    let db = new sqlite3.Database(gemmaDBDestinationPath);

    db.all('PRAGMA table_info (' + tableInfo + ')', (err, rows) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        db.close();
        resolve(rows);
      }

    });
  })

}

function queryTableInfoSpecial(tableInfo, startRow, endRow, selectedColumns) {

  return new Promise((resolve, reject) => {
    let db = new sqlite3.Database(gemmaDBDestinationPath);

    // Generate the column list string
    const columnList = selectedColumns.join(',');

    console.log("Begin " + columnList);

    db.all('SELECT ' + columnList + ' FROM ' + tableInfo + ' WHERE Id > ' + startRow + ' AND Id <= ' + endRow, (err, rows) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        // gemmaData = rows;
        // console.log(rows[0]);
        db.close();

        resolve(rows);
      }

    });

  });

}
function queryTableInfo(tableInfo, startRow, endRow) {

  return new Promise((resolve, reject) => {
    let db = new sqlite3.Database(gemmaDBDestinationPath);

    if (startRow == null) {
      db.all('SELECT * FROM ' + tableInfo, (err, rows) => {
        if (err) {
          console.error(err.message);
          reject(err);
        } else {
          // gemmaData = rows;
          // console.log(rows[0]);
          db.close();

          resolve(rows);
        }

      });
    } else {

      db.all('SELECT * FROM ' + tableInfo + ' WHERE Id > ' + startRow + ' AND Id <= ' + endRow, (err, rows) => {
        if (err) {
          console.error(err.message);
          reject(err);
        } else {
          // gemmaData = rows;
          // console.log(rows[0]);
          db.close();

          resolve(rows);
        }

      });

    }

  });

}

app.set('view engine', 'ejs');
// Serve static files from the "public" directory
// app.use(express.static('web'));
app.use(express.static(__dirname + '/web'));
app.use((req, res, next) => {

  fs.stat(gemmaDBDestinationPath, (err, stats) => {
    if (err) {
      console.error(err);
      // return;
    } else {

      // Access the file size from the "stats" object
      const fileSizeInBytes = stats.size;
      // const fileSizeInKilobytes = fileSizeInBytes / 1024;
      // const fileSizeInMegabytes = fileSizeInKilobytes / 1024;
      //
      // console.log(`File Size: ${fileSizeInBytes} bytes`);
      // console.log(`File Size: ${fileSizeInKilobytes} KB`);
      // console.log(`File Size: ${fileSizeInMegabytes} MB`);
      //
      if (fileSizeInBytes > 0) {
        initDB();
      }

    }

    next();

  });

  // fs.access(gemmaDBDestinationPath, fs.constants.F_OK, (err) => {
  //
  //   if (next.size > 0) {
  //     initDB();
  //   }
  //
  //   next();
  // });
})
// serve the homepage
app.get('/', (req, res) => {

  let gemmaData = [];
  let gemmaDataColumn = [];
  let tableName = "";

  res.render('index', { wholeDB, gemmaDataColumn, gemmaData, mineName, tableName });
});

app.get('/index.html', (req, res) => {
  res.sendFile(__dirname + '/web/index.html');
});

app.get('/table/:tableName', async (req, res) => {

  if (req.url.includes('/table/')) {
    // const urlPath = req.url.replace("table/", "");
    // const tableName = urlPath.replace(/^\/+|\/+$/g, '');

    const tableName = req.params.tableName;

    const totalRecords = await queryTableInfo(tableName);
    const gemmaData = await queryTableInfo(tableName, 0, 100);
    const gemmaDataColumn = await queryTableColumnInfo(tableName);

    res.send([gemmaData, gemmaDataColumn, totalRecords]);

  } else {
    res.send("didnt implement yet " + req.url);
  }

})

app.get('/table/:tableName/:startRow/:endRow/:selectedColumns', async (req, res) => {

  if (req.url.includes('/table/')) {
    // const urlPath = req.url.replace("table/", "");
    // const tableName = urlPath.replace(/^\/+|\/+$/g, '');

    const tableName = req.params.tableName;
    const startRow = req.params.startRow;
    const endRow = req.params.endRow;
    const selectedColumns = req.params.selectedColumns;

    let gemmaData;
    let gemmaDataColumn;

    if (selectedColumns !== "null") {
      const arrayColumns = selectedColumns.split(',');
      console.log("Fetching " + arrayColumns);
      gemmaData = await queryTableInfoSpecial(tableName, startRow, endRow, arrayColumns);
      gemmaDataColumn = await queryTableColumnInfoSpecial(tableName, arrayColumns);
    } else {
      gemmaData = await queryTableInfo(tableName, startRow, endRow);
      gemmaDataColumn = await queryTableColumnInfo(tableName);
    }

    res.send([gemmaData, gemmaDataColumn]);

  } else {
    res.send("didnt implement yet " + req.url);
  }

})

// Define a route to handle the button click event
app.get('/gg', (req, res) => {
  console.log('Button clicked!');
  res.send('Button clicked!');
});

app.post('/copydb', (req, res) => {

  if (!req.files || Object.keys(req.files).length === 0) {
    console.log(Object.keys(req));
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "myFile") is used to retrieve the uploaded file
  const myFile = req.files.gemmadb;

  const sourcePath = myFile.path;

  fs.unlink(gemmaDBDestinationPath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Error deleting existing file:', err);
    } else {
      console.log('Existing file deleted successfully.');

      // Copy the new file to gemmaDBDestinationPath
      fs.copyFile(sourcePath, gemmaDBDestinationPath, (err) => {
        if (err) {
          console.error('Error copying file:', err);
        } else {
          console.log('File replaced successfully.');
          mineName = [];
          initDB();
          res.send('File replaced success');
        }
      });
    }
  });

  // fs.copyFile(sourcePath, gemmaDBDestinationPath, (err) => {
  //   if (err) {
  //     console.error('Error copying file:', err);
  //   } else {
  //     console.log('File copied successfully.');
  //     initDB();
  //     res.send('File copied success');
  //   }
  // });

});

// Start the server
app.listen(8080, () => {
  console.log('Server started on port 8080');
});
