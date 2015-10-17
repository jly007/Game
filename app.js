var express = require('express');
var connection = require('./dbConnect');

var port = process.env.PORT || 3000;
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

//app.set('views', __dirname + '/views')
app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.listen(port);

//related to network
var globalPathFlow = [0,0,0];//路径实时选择的人数
var globalPathTime = [20,25,30];//每条路径的cost

var link_path_matrix = [[1,0,0],[1,0,1],[0,1,1],[0,1,0],[0,0,1]];
var path_link_matrix = [[1,1,0,0,0],[0,0,1,1,0],[0,1,1,0,1]];
var link_capacity = [20,20,40,40,20];
var free_flow_time = [4.0,2.0,3.0,3.0,2.0];
var od_demand = 100;


var day = 1;//当前第几天
var round = 0;
var isready = false;

//597499982@qq.com herry2021058
//112.74.214.106:3000
//121.42.27.94:3000

// /usr/local/mysql/bin/mysql
// sudo /usr/local/mysql/support-files/mysql.server start

//sudo ln -s "$(which nodejs)" /usr/bin/node
//npm install express --save
//npm install ejs --save
//npm install body-parser --save
//npm install mysql --save
//npm install cookie-parser --save


//npm install node-mysql --save

console.log('web start' + port);

app.get('/', function (req,res){
	if (req.cookies.isLogged) { //如果用户已经登录,渲染等待比赛页面
		res.render('wait.ejs',{

		});
		/*
		res.render('usergame.ejs',{
			day : day,
			round : round,
			pathCost : pathCost
		});
*/	
	} else { //没有登录,展示登录界面
		res.render('login.ejs',{

		});
	}
});

app.get('/wait', function (req, res) {
	res.render('wait.ejs',{

	});
});

app.get('/login', function (req,res){
	if (req.cookies.isLogged) { //如果用户已经登录
		res.render('wait.ejs',{

		});
		/*
		res.render('usergame.ejs',{
			day : day,
			round : round,
			pathCost : pathCost
		});
*/
} else {
	res.render('login.ejs',{

	});
}
});

app.post('/loginSubmit',function (req,res){
	//console.log('login number:' + req.body.inputNumber);
	if (req.cookies.isLogged) { //如果用户已经登录
		var pathTime = [0,0,0];
		pathTime[0] = free_flow_time[0] + free_flow_time[1];
		pathTime[1] = free_flow_time[2] + free_flow_time[3];
		pathTime[2] = free_flow_time[2] + free_flow_time[4] + free_flow_time[1];

		res.render('usergame.ejs',{
			day : day,
			pathCost : free_flow_time
		});
	} else {
		//查询数据库，看是否存在该账号
		var number = req.body.inputNumber;
		var phone = req.body.inputPhone;
		var querySQL = 'SELECT * FROM `users` WHERE usernumber = ? AND userphone = ?';
		connection.connection.query(querySQL, [number,phone], function (err,rows,fields){
			if (err) {
				console.log('Query error : ' + err);
				return;
			}
    		if (rows[0]) { //存在该用户
    			//console.log(rows[0].id);
    			var updateSQL = 'UPDATE `users` SET islogged = 2 WHERE usernumber = ?';
    			connection.connection.query(updateSQL, [number], function (err,rows){
    				if (err) {
    					console.log('UPDATE error : ' + err);
    					return;
    				} 
    			});
    			res.send('one');
    		} 
    		else { //不存在用户
    			console.log('empty');
    			res.send('empty');
    		}
    	});
	}
});

app.get('/usergame', function (req,res){
	if (isready) { //master已经点击开始了
		if (day == 1) { //第一天 不用查询数据库
			res.render('usergame.ejs',{
				day : day,
				pathCost : free_flow_time
			});
		} else {
			var selectSQL = 'SELECT *from `record` WHERE round=? AND daynumber=?';
			connection.connection.query(selectSQL, [round,day-1], function (err,rows){
				if (err) {
					console.log('SELECT error : ' + err);
					return;
				}
				var pathFlow = [0,0,0];
				pathFlow[0] = rows[0].routeone;
				pathFlow[1] = rows[0].routetwo;
				pathFlow[2] = rows[0].routethree;

				var pathTime = [0,0,0];
				var linkTime = cal_link_time(pathFlow);
				pathTime = cal_path_time(linkTime);

				res.render('usergame.ejs',{
					day : day,
					pathCost : pathTime
				});
			});
		}
	} else { // 还没准备好

	}
});

app.post('/routechoice',function (req,res){
	var number = req.body.number;
	var routechoice = req.body.routechoice;
	//console.log('choice body:' + number);
	//console.log(routechoice);

	//判断是否已经提交过这一天的选择
	var querySQL = 'SELECT * FROM `detail` WHERE round = ? AND usernumber = ? AND daynumber = ?';
	connection.connection.query(querySQL, [round,number,day],function (err,rows){
		if (err) {
			console.log('QUERY error : ' + err);
			return;
		} else { 
				if (rows[0]) { //已经选择过
					res.send('repeat');
    			} else { //还没有选择过
    				var insertSQL = 'INSERT INTO `detail`(round,usernumber,daynumber,route) VALUES (?,?,?,?)';
    				connection.connection.query(insertSQL, [round,number,day,routechoice], function (err,rows){
    					if (err) {
    						console.log('INSERT error : ' + err);
    						return;
    					} else {
    						res.send('insertsuccess');
    					}
    				});
    			}
    		}
    	});
});

app.get('/nextday', function (req,res){
	res.render('nextday.ejs', {
	});
});

// app.post('movetonext' function (req,res) {
	
// 	res.render('usergame.ejs',{
// 		day : day,
// 		pathCost : pathCost,
// 	});
// })

//master~~~~~
app.get('/master', function (req,res){
	res.render('master.ejs',{
		
	});
});

app.get('/masterend',function (req,res) {
	isready = false;
	//计算每一天每条路径的收益
	var user_cost = [];

	var querySQL = 'SELECT * FROM `record` WHERE round=?';
	connection.connection.query(querySQL, [round], function(err,costs){
		if (err) {
			console.log('QUERY error : ' + err);
			return;
		}
		var cost_day = [];
		for (var k = 0; k < costs.length; k++) {
			cost_day[k] = {first:costs[k].onecost,second:costs[k].twocost,third:costs[k].threecost};
		};
		var queryUserSQL = 'SELECT * FROM `users` WHERE islogged = 2';
		connection.connection.query(queryUserSQL, [], function(err,users){
			if (err) {
				console.log('QUERY error : ' + err);
				return;
			}
			for (var i = 0; i < users.length; i++) {
				var total = 0;
				var queryDetailSQL = 'SELECT * FROM `detail` WHERE round=? AND usernumber=?';
				connection.connection.query(queryDetailSQL, [round,users[i].usernumber], function(err,details){
					if (err) {
						console.log('QUERY error : ' + err);
						return;
					}
					if (details.length === costs.length) { //参与到了每一天
						for (var j = 0; j < details.length; j++) {
							if (details[j].route === 1) {
								total = total + cost_day[j].first;
							};
							if (details[j].route === 2) {
								total = total + cost_day[j].second;
							};
							if (details[j].route === 3) {
								total = total + cost_day[j].third;
							};
						};
					} else { //数据不全
						total = -10;
					}
					user_cost[i] = {number:users[i].usernumber,cost:total};
				});
			};
			res.send(user_cost);
		});

	});

	/*
	//计算所有用户的总cost
	var queryUserSQL = 'SELECT * FROM `users` WHERE islogged = 2';
	connection.connection.query(queryUserSQL, [], function(err,rows){
		if (err) {
			console.log('QUERY error : ' + err);
			return;
		}
		var 
		for (var i = 0; i < rows.length; i++) {
			var queryDetailSQL = 'SELECT * FROM `detail` WHERE round=? AND usernumber=?';
			connection.connection.query(queryUserSQL, [round,rows[i].usernumber], function(err,results){
				if (err) {
					console.log('QUERY error : ' + err);
					return;
				}
				for (var j = 0; j < results.length; j++) {
					results[i]
				};

			});
			
		};
		
	});
*/
});

app.get('/masterinit', function (req,res){
	isready = false;
	//从数据库查询已经登录的人数
	var loginCount = 0;
	var querySQL = 'SELECT * FROM `users` WHERE islogged = 2';
	connection.connection.query(querySQL, [], function(err,rows){
		if (err) {
			console.log('QUERY error : ' + err);
			return;
		}
		loginCount = rows.length;
		console.log('count : ' + loginCount);
		res.render('masterinit.ejs',{
			loginCount : loginCount
		});
	});
});

app.post('/gamestart',function (req,res){
	isready = true;
	var inputRound = req.body.inputRound;
	//初始化
	round = inputRound;
	day = 1;
	var pathFlow = [0,0,0];
	var pathTime = [0,0,0];
	var linkTime = cal_link_time(pathFlow);
	pathTime = cal_path_time(linkTime);

	res.render('mastermain.ejs',{
		round : round,
		day : day,
		pathChooseNumber : pathFlow,
		pathCost : pathTime
	});
});

app.get('/mastermain', function (req,res){
	globalPathFlow = [0,0,0];
	globalPathTime = [0,0,0];
	var selectSQL = 'SELECT *from `detail` WHERE round=? AND daynumber=?';
	connection.connection.query(selectSQL, [round,day], function (err,rows){
		if (err) {
			console.log('SELECT error : ' + err);
			return;
		}
		for (var i = 0; i < rows.length; i++) {
			if (rows[i].route === 1) {
				globalPathFlow[0] = globalPathFlow[0] + 1;
			};
			if (rows[i].route === 2) {
				globalPathFlow[1] = globalPathFlow[1] + 1;
			};
			if (rows[i].route === 3) {
				globalPathFlow[2] = globalPathFlow[2] + 1;
			};
		};
		var linkFlow = cal_link_time(globalPathFlow);
		globalPathTime = cal_path_time(linkFlow);
		console.log(globalPathTime);
		res.render('mastermain.ejs',{
			day : day,
			round : round,
			pathChooseNumber : globalPathFlow,
			pathCost : globalPathTime
		});
	});
});

app.get('/masternext', function (req,res){
	//计算这一天的收益
	//把这一天的记录添加到数据库中
	var insertSQL = 'INSERT INTO `record`(round,daynumber,routeone,routetwo,routethree) VALUES (?,?,?,?,?)'
	connection.connection.query(insertSQL, [round,day,globalPathFlow[0],globalPathFlow[1],globalPathFlow[2]], function (err,rows){
		if (err) {
			console.log('INSERT error : ' + err);
			return;
		}
		day = day + 1;


		res.redirect('/mastermain');
	});
});

app.get('/figure', function (req,res){
	var selectSQL = 'SELECT *from `record` WHERE round=?';
	connection.connection.query(selectSQL, [round], function (err,rows){
		if (err) {
			console.log('SELECT error : ' + err);
			return;
		}
		var pathTimeVector = [];
		for (var i = 0; i < rows.length; i++) {
			var pathFlow = [0,0,0];
			pathFlow[0] = rows[i].routeone;
			pathFlow[1] = rows[i].routetwo;
			pathFlow[2] = rows[i].routethree;
			var linkTime = cal_link_time(pathFlow);
			var pathTime = cal_path_time(linkTime);
			pathTimeVector[i] = pathTime;
		};
		res.send(pathTimeVector);
	});
	
	
});

function cal_link_time (path_flow) {
	var link_time = [0,0,0,0,0];
	var link_flow = [0,0,0,0,0];
	for (var i = 0; i < link_flow.length; i++) {
		var link_row = link_path_matrix[i];
		for (var j = 0; j < link_row.length; j++) { //
			link_flow[i] = link_flow[i] + link_row[j] * path_flow[j];
		};
	};
	for (var i = 0; i < link_time.length; i++) {
		link_time[i] = free_flow_time[i]*(1+0.15*Math.pow(link_flow[i]/link_capacity[i],4));
	};
	return link_time;
}

function cal_path_time (link_time) {
	var path_time = [0,0,0];
	for (var i = 0; i < path_time.length; i++) {
		var path_row = path_link_matrix[i];
		for (var j = 0; j < path_row.length; j++) {
			path_time[i] = path_time[i] + path_row[j] * link_time[j];
		};
	};
	for (var i = 0; i < path_time.length; i++) {
			var number = path_time[i];
			number = number.toFixed(1);
			path_time[i] = number;
		};
		//alert(path_time);
	return path_time;
}
