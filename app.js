const express = require("express");
const app = express();
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//api1 for the method Post
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(username);
  console.log(hashedPassword);
  console.log(password);
  console.log("passwordcompared");

  const comparedPassword = await bcrypt.compare(password, hashedPassword);
  console.log(comparedPassword);
  const checkingUsername = `
        SELECT * FROM user WHERE username='${username}'
        `;
  const checkingUserResponse = await db.get(checkingUsername);
  console.log(checkingUserResponse);
  if (checkingUserResponse !== undefined) {
    console.log("user undefined");
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      console.log("password checked");
      response.status(400);
      response.send("Password is too short");
    } else {
      const addingUserInTable = `
        INSERT INTO user(user_id,name,username,password,gender)
        VALUES(9,'${name}','${username}','${hashedPassword}','${gender}')
        `;
      const addingUserResponse = await db.run(addingUserInTable);
      console.log("user inserted");
      response.status("200");
      response.send("User created successfully");
    }
  }
});

//api 2 for the login purpose

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const checkingLogin = `
    SELECT *
    FROM user 
    WHERE username='${username}'
    `;
  const loginResponse = await db.get(checkingLogin);
  console.log(loginResponse);
  if (loginResponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPassMatched = await bcrypt.compare(
      password,
      loginResponse.password
    );

    if (isPassMatched) {
      let payload = { username: username };
      let jwtToken;
      jwtToken = jwt.sign(payload, "secretlyKill");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//api  for the authenticating the jwtToken

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid jWT Token");
    } else {
      jwt.verify(jwtToken, "secretlyKill", async (error, payload) => {
        /*const getDetails = `
         SELECT user_id FROM user WHERE username='${payload.username}'
         `;
        const getIds = await db.all(getDetails);

        const followersIds = `
        SELECT follower_user_id,following_user_id FROM follower WHERE
         follower_user_id=${getIds}
        `;
        const followersResponse = await db.all(followersIds);
        console.log("ids and followers");
        console.log(getIds);
        console.log(followersIds);
        console.log(followersResponse);
        console.log("completeed followeers");*/
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          console.log(payload);
          request.username = payload.username;
          next();
        }
      });
    }
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

//api 3 for the user tweets feed
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { username } = request;
  console.log(username);
  console.log("successfully in the user tweets");
  const getUserTweet = `
    select user_id from user  WHERE username='${username}';
    `;
  const userTweetResponse = await db.get(getUserTweet);
  console.log(userTweetResponse);

  const getFollower = `
  SELECT following_user_id FROM follower WHERE
  follower_user_id=${userTweetResponse.user_id};
  `;
  const getFollowerResponse = await db.all(getFollower);

  const followingIds = getFollowerResponse.map((each) => {
    return each.following_user_id;
  });

  console.log(getFollower);
  console.log(getFollowerResponse);
  //response.send(userTweetResponse);
  const tweetsQuery = `
  SELECT username,tweet,date_time AS dateTime FROM tweet INNER JOIN user
    ON tweet.user_id=user.user_id WHERE tweet.user_id IN (${followingIds})
    ORDER BY tweet.date_time DESC LIMIT 4
   ;
  `;
  const tweetsResponse = await db.all(tweetsQuery);
  console.log(tweetsResponse);
  response.send(tweetsResponse);
});

//api 4 for the following users

app.get("/user/following/", authenticateToken, async (request, response) => {
  let { username } = request;
  console.log(username);
  const getUsers = `
  SELECT user_id FROM user WHERE username='${username}'
  `;
  const getUsersResponse = await db.get(getUsers);
  console.log(getUsers);
  console.log(getUsersResponse);
  const getFollowing = `
  SELECT following_user_id FROM follower INNER  JOIN user ON
   user.user_id=follower.follower_user_id
    WHERE
   follower_user_id= ${getUsersResponse.user_id}
  `;
  const followingResponse = await db.all(getFollowing);
  const ids = followingResponse.map((eachUser) => {
    return eachUser.following_user_id;
  });

  console.log(followingResponse);
  console.log("following response and going to following user");
  const followingUser = `
  SELECT name FROM user WHERE user_id IN (${ids})
  `;
  console.log(followingUser);
  const followingUserResponse = await db.all(followingUser);
  response.send(followingUserResponse);
  console.log(followingUserResponse);
});

//the api 5 for the followers
app.get("/user/followers/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getUserQuery = `
    SELECT * FROM user WHERE username='${username}'
    `;
  console.log(getUserQuery);
  const getId = await db.get(getUserQuery);
  const a = `
    SELECT follower_user_id FROM follower INNER JOIN user 
    ON follower.follower_user_id=user.user_id
    WHERE following_user_id=${getId.user_id}
    `;
  console.log(a);
  const b = await db.all(a);
  console.log(b);
  const mappedIds = b.map((eachUser) => {
    return eachUser.follower_user_id;
  });
  const followerIdNames = `
  SELECT name from user WHERE user_id IN (${mappedIds})
  `;
  const followernameResponse = await db.all(followerIdNames);
  console.log(followerIdNames);
  response.send(followernameResponse);
  console.log(followernameResponse);
});
// api 6 output for tweetId  like,replies,tweet,date

const apiOutput = (tweetAndDate, likeCount, replyCount) => {
  return {
    tweet: tweetAndDate.tweet,
    likes: likeCount.likes,
    replies: replyCount.reply,
    dateTime: tweetAndDate.dateTime,
  };
};

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  let { username } = request;
  const getUserQuery = `
  SELECT user_id FROM user WHERE username='${username}'
  `;
  const userId = await db.get(getUserQuery);
  const followingUsersQuery = `
  SELECT following_user_id FROM follower INNER JOIN user 
  ON follower.follower_user_id = user.user_id
  WHERE follower_user_id=${userId.user_id}
  `;
  const followingUsersRes = await db.all(followingUsersQuery);
  const mapFollowing = followingUsersRes.map((eachUser) => {
    return eachUser.following_user_id;
  });

  const getTweetIds = `
  SELECT tweet_id FROM tweet WHERE user_id IN (${mapFollowing})
  `;
  const tweetIdsArray = await db.all(getTweetIds);
  const mapTweetIds = tweetIdsArray.map((eachId) => {
    return eachId.tweet_id;
  });
  console.log(mapTweetIds);
  if (mapTweetIds.includes(parseInt(tweetId))) {
    const getLikesQuery = `
      SELECT COUNT(user_id)AS likes FROM like WHERE tweet_id=${tweetId}
      `;
    const likeCount = await db.get(getLikesQuery);

    const getReplyQuery = `
      SELECT COUNT(user_id)AS reply FROM reply WHERE tweet_id=${tweetId}
      `;
    const replyCount = await db.get(getReplyQuery);

    const tweetAndDateQuery = `
      SELECT tweet,date_time As dateTime  FROM tweet WHERE tweet_id=${tweetId}
      `;
    const tweetAndDate = await db.get(tweetAndDateQuery);
    console.log(tweetAndDate);
    response.send(apiOutput(tweetAndDate, likeCount, replyCount));
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});
//api 7 for the likes of tweet

const convert = (mapUserNames) => {
  return { likes: mapUserNames };
};

app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    let { username } = request;
    const getUserQuery = `
  SELECT user_id FROM user WHERE username='${username}'
  `;
    const userId = await db.get(getUserQuery);
    const followingUsersQuery = `
  SELECT following_user_id FROM follower INNER JOIN user 
  ON follower.follower_user_id = user.user_id
  WHERE follower_user_id=${userId.user_id}
  `;
    const followingUsersRes = await db.all(followingUsersQuery);
    const mapFollowing = followingUsersRes.map((eachUser) => {
      return eachUser.following_user_id;
    });

    const getTweetIds = `
  SELECT tweet_id FROM tweet WHERE user_id IN (${mapFollowing})
  `;
    const tweetIdsArray = await db.all(getTweetIds);
    const mapTweetIds = tweetIdsArray.map((eachId) => {
      return eachId.tweet_id;
    });
    console.log(mapTweetIds);
    if (mapTweetIds.includes(parseInt(tweetId))) {
      const getLikesQuery = `
      SELECT username as likes  FROM like INNER JOIN user ON user.user_id=like.user_id WHERE tweet_id=${tweetId}
      `;
      const likedUser = await db.all(getLikesQuery);
      console.log(likedUser);
      const mapUserNames = likedUser.map((eachUser) => {
        return eachUser.likes;
      });
      console.log(mapUserNames);
      response.send(convert(mapUserNames));
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

// api 8 code for tweet replies

const convertToFormat = (getReply) => {
  return { replies: getReply };
};

app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    let { username } = request;
    let { tweetId } = request.params;
    const getQuery = `
   SELECT  user_id FROM user WHERE username='${username}'
   `;
    const getUser = await db.get(getQuery);
    const followingQuery = `
    SELECT * FROM user INNER JOIN follower ON
     user.user_id=follower.follower_user_id
     WHERE user_id=${getUser.user_id}
    `;
    const followingIds = await db.all(followingQuery);
    const mapFollowingIds = followingIds.map((eachUser) => {
      return eachUser.following_user_id;
    });
    const getTweetIdsQuery = `
    SELECT tweet_id FROM tweet WHERE user_id IN (${mapFollowingIds})
    `;
    const getTweetIds = await db.all(getTweetIdsQuery);
    const mapTweetIds = getTweetIds.map((eachId) => {
      return eachId.tweet_id;
    });
    if (mapTweetIds.includes(parseInt(tweetId))) {
      const getReplyQuery = `
        SELECT name,reply FROM user INNER JOIN reply  ON user.user_id=reply.user_id
        WHERE tweet_id=${tweetId}
        `;
      const getReply = await db.all(getReplyQuery);
      console.log(getReply);
      response.send(convertToFormat(getReply));
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

//api 9
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const { username } = request;
  const selectUserQuery = `
    SELECT * FROM user WHERE username = '${username}';
    `;
  const dbUser = await db.get(selectUserQuery);
  const { user_id } = dbUser;
  //   const user_id = 4;
  const getTweetsQuery = `
  SELECT * FROM tweet WHERE user_id = ${user_id}
  ORDER BY tweet_id;
  `;
  const tweetObjectsList = await db.all(getTweetsQuery);

  const tweetIdsList = tweetObjectsList.map((object) => {
    return object.tweet_id;
  });

  const getLikesQuery = `
    SELECT COUNT(like_id) AS likes FROM like 
    WHERE tweet_id IN (${tweetIdsList}) GROUP BY tweet_id
    ORDER BY tweet_id;
    `;
  const likesObjectsList = await db.all(getLikesQuery);
  const getRepliesQuery = `
    SELECT COUNT(reply_id) AS replies FROM reply 
    WHERE tweet_id IN (${tweetIdsList}) GROUP BY tweet_id
    ORDER BY tweet_id;
    `;
  const repliesObjectsList = await db.all(getRepliesQuery);
  response.send(
    tweetObjectsList.map((tweetObj, index) => {
      const likes = likesObjectsList[index] ? likesObjectsList[index].likes : 0;
      const replies = repliesObjectsList[index]
        ? repliesObjectsList[index].replies
        : 0;
      return {
        tweet: tweetObj.tweet,
        likes,
        replies,
        dateTime: tweetObj.date_time,
      };
    })
  );
});

// api 10 code for the tweet creation in tweet table

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  let { username } = request;

  const getUserIdQuery = `select user_id from user where username='${username}';`;
  const getUserId = await db.get(getUserIdQuery);
  //console.log(getUserId.user_id);
  const { tweet } = request.body;
  const currentDate = new Date();
  console.log(currentDate.toISOString().replace("T", " "));

  const postRequestQuery = `insert into tweet(tweet, user_id, date_time) values ("${tweet}", ${getUserId.user_id}, '${currentDate}');`;
  const responseResult = await db.run(postRequestQuery);

  response.send("Created a Tweet");
});
//api 11 for the deletion the tweet from tweet
app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    //console.log(tweetId);
    let { username } = request;
    const getUserIdQuery = `select user_id from user where username='${username}';`;
    const getUserId = await db.get(getUserIdQuery);
    //console.log(getUserId.user_id);
    //tweets made by the user
    const getUserTweetsListQuery = `select tweet_id from tweet where user_id=${getUserId.user_id};`;
    const getUserTweetsListArray = await db.all(getUserTweetsListQuery);
    const getUserTweetsList = getUserTweetsListArray.map((eachTweetId) => {
      return eachTweetId.tweet_id;
    });
    console.log(getUserTweetsList);
    if (getUserTweetsList.includes(parseInt(tweetId))) {
      const deleteTweetQuery = `delete from tweet where tweet_id=${tweetId};`;
      await db.run(deleteTweetQuery);
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

module.exports = app;
