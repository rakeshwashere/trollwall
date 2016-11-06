var express = require('express')
var pg = require('pg')
var twitter = require('twitter')
var request = require('request')
var cors = require('cors')

var databasePort = process.env.CSDBPORT || 5432
var databaseName = 'trollwall'//process.env.CSDBNAME || ''
var databaseUserName = process.env.CSDBUSER 
var databasePassword = process.env.CSDBPASSWORD 
var databaseURL = process.env.CSDBURL
var barkAccessToken = process.env.BARK_TOKEN
var app = express()

var conString = `postgres://${databaseUserName}:${databasePassword}@${databaseURL}:${databasePort}/${databaseName}`
var client = new pg.Client(conString)
client.connect()

app.use(cors())
app.get('/', function (req, res) {
	res.send('Hello World!')
})

app.listen(3000, function () {
	console.log('Example app listening on port 3000!')
})





function checkTweets (message, callback) {
	request({ url: 'https://partner.bark.us/api/v1/messages?token='+barkAccessToken, //URL to hit
	    // qs: {from: 'blog example', time: +new Date()}, //Query string data
	    headers: {
		    'Content-Type': 'application/json; charset=utf-8'
		},
	    method: 'POST',
	    //Lets post the following key/values as form
	    json: {
	    	message: message
    	}
	}, function(error, response, body){
		if (error) {
			callback({success: false, message: 'Error in API call'});
		} 
		else {
			if (body.success) {
				callback({success: body.success, message: body.abusive});
			}
			else {
				console.log("FAILURE: RETRY");
				callback({success: body.success, message: 'API call failed'});
			}
		}
	});
}


app.get('/checkTweet', function (req, res) {
	console.log(req.query.tweet)
	// var isTimedOut = false;
	// var isReqComplete = false;
	// res.send(req.query.tweet)

	// setTimeout(function() {
	// 	if (isReqComplete)
	// 		retur/n
	// 	isTimedOut = true
	// 	console.log('trying to send timeout message')
	// 	res.send('bark api not responding')

	// }, 5000)

	// request({ url: 'https://partner.bark.us/api/v1/messages?token=gympEyUqvY4Vg5P55nqo13uC', //URL to hit
	//     // qs: {from: 'blog example', time: +new Date()}, //Query string data
	    
	//     method: 'POST',
	//     //Lets post the following key/values as form
	//     json: {
	//     	message: req.query.tweet
 //    	}
	// 	}, function(error, response, body){
	// 		// if (isTimedOut) {
	// 		// 	return
	// 		// 	}
	// 		// }
	// 		// isReqComplete = true
	// 		// console(isReqComplete)
	// 		if(error) {
	// 			console.log(error);
	// 		} else {
	// 			console.log(response.statusCode, body);
	// 			res.send(body)
	// 		}
	// 	});

	checkTweets(req.query.tweet, function(barkResponse) {
		res.send(barkResponse)
	})

})

app.get('/score/twitter/', function(request, res) {
	var params = {screen_name: request.query.user};
	client.get('statuses/user_timeline', params, function(error, tweets, response) {
		if (!error) {
			//timeoutPointer = setTimeout(function() {
			// 	res.send({success : false, message : 'Timeout' });
			//}, 10000);
			abusiveTweets = 0;
			totalTweets = tweets.length;
			processedCount = 0;
			for (tweetIterator in tweets) {
				setTimeout( (function(k) {
					checkTweets(tweets[k].text, function(barkResponse) {
						processedCount ++;
						if (barkResponse.success && barkResponse.message) {
							abusiveTweets ++;
						}
					
						if (processedCount == totalTweets) {
							//clearTimeout(timeoutPointer);
							try {
								res.send({ score : 100 * (1 - abusiveTweets / totalTweets), abusiveCount : abusiveTweets });
							}
							catch(e) {}
						}
					});
				}), 400 * tweetIterator, tweetIterator);
			}
		}
		else {
			try {
				res.send({success : false, message : 'Error with Twitter API' });
			}
			catch(e) {}
		}
	});
});



var client = new twitter({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var params = {q: '@gvivek19'};
client.get('search/tweets', params, function(error, tweets, response) {
	if (!error) {
		// console.log(JSON.stringify(tweets));
	}
});

