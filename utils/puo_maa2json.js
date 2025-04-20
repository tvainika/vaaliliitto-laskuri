import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

if (process.argv.length < 3) {
    console.error('Usage: node puo_maa2json.js <path-to-csv-file>');
    process.exit(1);
}

const csvFilePath = process.argv[2];

const kunnat = {};

fs.createReadStream(path.resolve(csvFilePath))
    .pipe(csv({separator: ';'}))
    .on('data', (row) => {
        if (row["Kuntanro"] === "***") {
            return;
        }
        if (!kunnat[row["Kunta"].trim()]) {
            kunnat[row["Kunta"].trim()] = {};
        }
        kunnat[row["Kunta"].trim()][row["Puolue"].trim()] = {paikat: parseInt(row["Paikat"], 10), aanet: parseInt(row["Äänet"], 10)};
    })
    .on('end', () => {
        console.log(JSON.stringify(kunnat, null, 2));
    })
    .on('error', (err) => {
        console.error('Error reading the CSV file:', err.message);
        process.exit(1);
    });