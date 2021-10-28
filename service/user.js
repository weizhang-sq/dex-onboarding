const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const utils = require('./utils');

exports.setupRouting = (app, passport) => {
  const useAuth = passport.authenticate('jwt', { session: false });
  app.post('/user/login', login);
  app.post('/user/create', create);
  app.post('/user/refreshAccessToken', useAuth, refreshAccessToken);
  app.put('/user/data/*', useAuth, setUserData);
  app.get('/user/data/*', useAuth, getUserData);
  app.delete('/user/data/*', useAuth, deleteUserData);
  app.put('/user/resetPassword', resetPassword);
  app.get('/user/profile', useAuth, getProfile);
  app.put('/user/updateProfile', useAuth, updateProfile);
  app.post('/user/registerDevice', useAuth, registerDevice);
  app.post('/user/unregisterDevice', useAuth, unregisterDevice);
  app.get('/user/inviteUsers', useAuth, getInviteUsersAsync);
  app.get('/user/getUpdate', useAuth, getUserUpdateAsync);
  app.delete('/user/message/:fromUserMessageId', useAuth, deleteUserMessageAsync);
};

exports.getUser = async (mysqlQuery, jwt_payload, done) => {
  try {
    const result = await mysqlQuery('SELECT UserId, LoginId FROM User WHERE UserId=? LIMIT 1', [jwt_payload.userId]);
    if (result.length === 1) {
      done(null, { userId: result[0].UserId, loginId: result[0].LoginId });
      return;
    }
  } catch (error) {
    console.log(error);
  }

  done(null, false);
};

async function setUserData(req, res) {
  try {
    const dataId = req.params[0];
    const bodyJson = JSON.stringify(req.body);

    // Write chat data to UserChatMessageLastReadTime table
    if (dataId.startsWith('chat,') && typeof req.body.time === 'number') {
      const items = dataId.split(',');
      const groupId = parseInt(items[items.length - 1]);
      const result = await req.mysqlQuery('REPLACE INTO UserChatMessageLastReadTime SET ?', {
        UserId: req.user.userId,
        StudyGroupId: groupId,
        LastReadTime: req.body.time
      });
      if (result.affectedRows === 0) {
        utils.sendBadRequestError(req, res, { error: 'Failed to update database!' });
        return;
      }

      res.status(200).send();
      return;
    }

    // Write notes data to UserNote table
    if (dataId.startsWith('notes,')) {
      const classIdOrResourceId = dataId.substr('notes,'.length);
      const classResult = await req.mysqlQuery('SELECT ClassId FROM Class WHERE ClassId=? OR ResourceId=? LIMIT 1', [
        classIdOrResourceId,
        classIdOrResourceId
      ]);
      if (classResult.length !== 1) {
        utils.sendBadRequestError(req, res, { error: 'Invalid classId or resourceId!' });
        return;
      }

      const result = await req.mysqlQuery('REPLACE INTO UserNote SET UserId=?, ClassId=?, Note=?, UpdateTime=NOW()', [
        req.user.userId,
        classResult[0].ClassId,
        utils.encodeString(bodyJson)
      ]);
      if (result.affectedRows === 0) {
        utils.sendBadRequestError(req, res, { error: 'Failed to update database!' });
        return;
      }

      res.status(200).send();
      return;
    }

    // Write answer data to UserAnswer table
    if (dataId.startsWith('answer,')) {
      const items = dataId.split(',');
      const classIdOrResourceId = items[1];
      const week = items[2];
      const classResult = await req.mysqlQuery('SELECT ClassId FROM Class WHERE ClassId=? OR ResourceId=? LIMIT 1', [
        classIdOrResourceId,
        classIdOrResourceId
      ]);
      if (classResult.length !== 1) {
        utils.sendBadRequestError(req, res, { error: 'Invalid classId or resourceId!' });
        return;
      }

      const result = await req.mysqlQuery(
        'REPLACE INTO UserAnswer SET UserId=?, ClassId=?, Week=?, Answer=?, Count=?, UpdateTime=NOW()',
        [req.user.userId, classResult[0].ClassId, week, utils.encodeString(bodyJson), Object.keys(req.body).length]
      );
      if (result.affectedRows === 0) {
        utils.sendBadRequestError(req, res, { error: 'Failed to update database!' });
        return;
      }

      res.status(200).send();
      return;
    }

    const result = await req.mysqlQuery('REPLACE INTO UserData SET UserId=?, Name=?, Content=?', [
      req.user.userId,
      dataId,
      utils.encodeString(bodyJson)
    ]);
    if (result.affectedRows === 0) {
      utils.sendBadRequestError(req, res, { error: 'Failed to update database!' });
      return;
    }

    res.status(200).send();
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function deleteUserData(req, res) {
  const dataId = req.params[0];

  try {
    await req.mysqlQuery('DELETE FROM UserData WHERE UserId=? AND Name=?', [req.user.userId, dataId]);

    res.status(200).send();
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function getUserData(req, res) {
  try {
    let dataId = req.params[0];

    // Read chat data from UserChatMessageLastReadTime table
    if (dataId.startsWith('chat,')) {
      const items = dataId.split(',');
      const groupId = parseInt(items[items.length - 1]);
      const result = await req.mysqlQuery(
        'SELECT LastReadTime FROM UserChatMessageLastReadTime WHERE UserId=? AND StudyGroupId=?',
        [req.user.userId, groupId]
      );
      if (result.length === 0) {
        res.status(404).send();
        return;
      }

      res.json({ time: result[0].LastReadTime });
      return;
    }

    // Read notes data from UserNote table
    if (dataId.startsWith('notes,')) {
      const classIdOrResourceId = dataId.substr('notes,'.length);
      const classResult = await req.mysqlQuery('SELECT ClassId FROM Class WHERE ClassId=? OR ResourceId=? LIMIT 1', [
        classIdOrResourceId,
        classIdOrResourceId
      ]);
      if (classResult.length !== 1) {
        res.status(404).send();
        return;
      }

      const result = await req.mysqlQuery('SELECT Note FROM UserNote WHERE UserId=? AND ClassId=? LIMIT 1', [
        req.user.userId,
        classResult[0].ClassId
      ]);
      if (result.length === 0) {
        res.status(404).send();
        return;
      }

      const content = JSON.parse(utils.decodeString(result[0].Note));
      res.json(content);
      return;
    }

    // Read answer data from UserAnswer table
    if (dataId.startsWith('answer,')) {
      const items = dataId.split(',');
      const classIdOrResourceId = items[1];
      const week = items[2];
      const classResult = await req.mysqlQuery('SELECT ClassId FROM Class WHERE ClassId=? OR ResourceId=? LIMIT 1', [
        classIdOrResourceId,
        classIdOrResourceId
      ]);
      if (classResult.length !== 1) {
        res.status(404).send();
        return;
      }

      const result = await req.mysqlQuery(
        'SELECT Answer FROM UserAnswer WHERE UserId=? AND ClassId=? AND Week=? LIMIT 1',
        [req.user.userId, classResult[0].ClassId, week]
      );
      if (result.length === 0) {
        res.status(404).send();
        return;
      }

      const content = JSON.parse(utils.decodeString(result[0].Answer));
      res.json(content);
      return;
    }

    const result = await req.mysqlQuery('SELECT Content FROM UserData WHERE UserId=? AND Name=? LIMIT 1', [
      req.user.userId,
      dataId
    ]);
    if (result.length === 0) {
      res.status(404).send();
      return;
    }

    const content = JSON.parse(utils.decodeString(result[0].Content));
    res.json(content);
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function login(req, res) {
  const loginId = (req.body.loginId || '').trim();
  const password = req.body.password;
  if (utils.isNullOrUndefined(loginId) || loginId.length < 6 || utils.isNullOrUndefined(password)) {
    utils.sendInvalidInput(req, res);
    return;
  }

  try {
    let result = await req.mysqlQuery(
      'SELECT UserId, Password, DisplayName, ResetToken, ResetTokenTime FROM User WHERE LoginId=? OR ResetToken=? LIMIT 1',
      [loginId, password]
    );
    if (result.length !== 1) {
      utils.sendBadRequestError(req, res, { error: 'User does not exist' });
      return;
    }

    const userId = result[0].UserId;
    const displayName = result[0].DisplayName;

    let reset;
    if (result[0].ResetToken === password) {
      // reset case
      const deltaMs = new Date() - result[0].ResetTokenTime;
      const deltaHour = deltaMs / 1000 / 60 / 60;
      if (deltaHour > 1) {
        utils.sendBadRequestError(req, res, { error: 'Token is already expired' });
        return;
      }

      reset = true;
    } else {
      // normal login via password
      if (!bcrypt.compareSync(password, result[0].Password)) {
        utils.sendBadRequestError(req, res, { error: 'Password is wrong' });
        return;
      }
    }

    // Check if user is church admin
    let isChurchAdmin, churchName, organizations;
    result = await req.mysqlQuery(
      `SELECT o.OrganizationId, o.Name FROM Organization AS o
      INNER JOIN OrganizationUser AS ou ON ou.OrganizationId=o.OrganizationId
      INNER JOIN User AS u ON u.UserId=ou.UserId
      WHERE ou.Role=1 AND ou.UserId=?`,
      [userId]
    );
    if (result.length > 0) {
      isChurchAdmin = 1;
      churchName = result[0].Name;
      organizations = result.map((item) => ({ id: item.OrganizationId, name: item.Name }));
    }

    const payload = { userId, loginId, isChurchAdmin };
    const accessToken = jwt.sign(payload, req.jwtOptions.secretOrKey, {
      expiresIn: req.jwtOptions.expiresIn
    });
    res.json({ accessToken, reset, displayName, isChurchAdmin, churchName, organizations });
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function create(req, res) {
  const displayName = req.body.displayName;
  const loginId = (req.body.loginId || '').trim();
  const loginIdType = req.body.loginIdType;
  const password = req.body.password;
  if (
    utils.isNullOrUndefined(displayName) ||
    loginId.length < 6 ||
    utils.isNullOrUndefined(loginIdType) ||
    utils.isNullOrUndefined(password)
  ) {
    utils.sendInvalidInput(req, res);
    return;
  }

  if (displayName.length < 1 || loginId.length < 6 || password < 6) {
    utils.sendBadRequestError(req, res, { error: 'DisplayName, email or password is too short' });
    return;
  }

  const isEmail = loginIdType.toLowerCase() === 'email';
  if (isEmail && !utils.isEmailValid(loginId)) {
    utils.sendBadRequestError(req, res, { error: 'Invalid email' });
    return;
  }

  try {
    let result = await req.mysqlQuery('SELECT 1 FROM User WHERE LoginId=? LIMIT 1', [loginId]);
    if (result.length !== 0) {
      utils.sendBadRequestError(req, res, { error: 'User already exists' });
      return;
    }

    // Add to database
    const data = {
      LoginId: loginId,
      LoginIdType: isEmail ? 0 : 1,
      DisplayName: displayName,
      Password: bcrypt.hashSync(password, 10)
    };

    result = await req.mysqlQuery('INSERT INTO User SET ?', data);
    if (result.affectedRows !== 1) {
      utils.sendBadRequestError(req, res, { error: 'Server error' });
      return;
    }

    const payload = { userId: result.insertId, loginId };
    const accessToken = jwt.sign(payload, req.jwtOptions.secretOrKey, {
      expiresIn: req.jwtOptions.expiresIn
    });
    res.status(201).json({ accessToken });
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

// Reset password by sending a token
async function resetPassword(req, res) {
  const loginId = (req.body.loginId || '').trim();

  if (utils.isNullOrUndefined(loginId) || loginId.length < 6) {
    utils.sendInvalidInput(req, res);
    return;
  }

  let token = '';
  for (let i = 0; i < 8; i++) {
    token += utils.getRandomInt(10).toString();
  }

  try {
    const result = await req.mysqlQuery(
      'UPDATE User SET ResetToken=?, ResetTokenTime=NOW() WHERE LoginIdType=0 AND LoginId=?',
      [token, loginId]
    );
    if (result.affectedRows !== 1) {
      utils.sendBadRequestError(req, res, { error: 'User does not exist' });
      return;
    }

    const mail = req.mail;
    const transporter = nodemailer.createTransport({
      host: mail.host,
      port: 465,
      secure: true,
      auth: { user: mail.user, pass: mail.pass }
    });
    const mailOptions = {
      from: mail.sender,
      to: loginId,
      subject: 'From iDigest',
      text: `Your temporary iDigest password is ${token}, it's valid for 1 hour, please login in iDigest and update your password. (This is an automatically generated email – please do not reply)`,
      html: `Your temporary iDigest password is <b><font color='red'>${token}</font></b>, it's valid for 1 hour, please login in iDigest and change your password. (This is an automatically generated email – please do not reply)`
    };
    transporter.sendMail(mailOptions).then((info) => {
      console.log('Message sent: %s', info.messageId);
    });

    res.status(200).send();
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function refreshAccessToken(req, res) {
  const payload = { userId: req.user.userId, loginId: req.user.loginId };
  const accessToken = jwt.sign(payload, req.jwtOptions.secretOrKey, {
    expiresIn: req.jwtOptions.expiresIn
  });
  res.json({ accessToken });
}

async function getProfile(req, res) {
  const userId = req.user.userId;

  try {
    const result = await req.mysqlQuery('SELECT DisplayName FROM User WHERE UserId=?', [userId]);
    if (result.length !== 1) {
      utils.sendBadRequestError(req, res, { error: 'User does not exist' });
      return;
    }

    res.json({ displayName: result[0].DisplayName });
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function updateProfile(req, res) {
  const displayName = req.body.displayName;
  const password = req.body.password;

  try {
    // Update displayName if specified
    if (!utils.isNullOrUndefined(displayName)) {
      if (displayName.length < 1) {
        utils.sendBadRequestError(req, res, {
          Error: 'displayName cannot be empty'
        });
        return;
      }

      const result = await req.mysqlQuery('UPDATE User SET DisplayName=? WHERE UserId=?', [
        displayName,
        req.user.userId
      ]);
      if (result.affectedRows !== 1) {
        utils.sendBadRequestError(req, res, { error: 'User does not exist' });
        return;
      }
    }

    // Update password if specified
    if (!utils.isNullOrUndefined(password)) {
      if (password.length < 6) {
        utils.sendBadRequestError(req, res, {
          Error: 'Password is too short'
        });
        return;
      }

      const result = await req.mysqlQuery("UPDATE User SET Password=?, ResetToken='' WHERE UserId=?", [
        bcrypt.hashSync(password, 10),
        req.user.userId
      ]);
      if (result.affectedRows !== 1) {
        utils.sendBadRequestError(req, res, { error: 'User does not exist' });
        return;
      }
    }

    res.status(200).send();
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function registerDevice(req, res) {
  const token = req.body.token;
  try {
    if (utils.isNullOrUndefined(token)) {
      utils.sendBadRequestError(req, res, { error: 'Missing token!' });
      return;
    }

    await req.mysqlQuery('DELETE FROM UserDevice WHERE Token=?', [token]);

    const result = await req.mysqlQuery('REPLACE INTO UserDevice SET ?', { UserId: req.user.userId, Token: token });
    if (result.affectedRows !== 1) {
      utils.sendBadRequestError(req, res, { error: 'Server error' });
      return;
    }

    res.status(200).send();
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function unregisterDevice(req, res) {
  const token = req.body.token;
  try {
    if (utils.isNullOrUndefined(token)) {
      utils.sendBadRequestError(req, res, { error: 'Missing token!' });
      return;
    }

    await req.mysqlQuery('DELETE FROM UserDevice WHERE UserId=? AND Token=?', [req.user.userId, token]);

    res.status(200).send();
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function getInviteUsersAsync(req, res) {
  try {
    const result = await req.mysqlQuery(
      `SELECT DISTINCT u.DisplayName, u.LoginId FROM StudyGroupUser AS sgu
    INNER JOIN StudyGroup AS sg ON sg.StudyGroupId=sgu.StudyGroupId
    INNER JOIN User AS u ON u.UserId=sgu.UserId
    WHERE sgu.StudyGroupId IN
    (SELECT StudyGroupId FROM StudyGroupUser WHERE UserId=? AND Status=1)
    ORDER BY u.DisplayName ASC`,
      [req.user.userId]
    );

    const json = [];
    result.map((user) => {
      json.push({
        displayName: user.DisplayName,
        loginId: user.LoginId
      });
    });
    res.json(json);
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function getUserMessagesAsync(mysqlQuery, userId) {
  const result = await mysqlQuery(
    'SELECT UserMessageId, Date, Category, Content FROM UserMessage WHERE UserId=? ORDER BY Date DESC',
    [userId]
  );

  return result.map((item) => ({
    id: item.UserMessageId,
    timestamp: utils.getJSTimestampFromDateString(item.Date),
    category: item.Category,
    message: item.Content
  }));
}

async function getUserUpdateAsync(req, res) {
  try {
    const groups = await utils.getUserStudyGroupsAsync(req.mysqlQuery, req.user.userId);
    const messages = await getUserMessagesAsync(req.mysqlQuery, req.user.userId);
    res.json({
      groups,
      messages
    });
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}

async function deleteUserMessageAsync(req, res) {
  try {
    await req.mysqlQuery('DELETE FROM UserMessage WHERE UserId=? AND UserMessageId<=?', [
      req.user.userId,
      req.params.fromUserMessageId
    ]);
    res.status(200).send();
  } catch (error) {
    console.log(error);
    utils.sendInternalServerError(req, res, { error: error.message + '\n\n' + error.stack });
  }
}
