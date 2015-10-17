var mysql = require('mysql');
var connection = mysql.createConnection({
	host : '127.0.0.1',
	user : 'root',
	database: 'rce',
	password : '',
	port: 3306,
});
connection.connect(function(err){
	if (err) {
		console.log('database connect error!err:' + err);
		return;
	}
	console.log('database connect succeed!');

});
exports.connection = connection;