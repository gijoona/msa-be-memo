const conf = require('../conf/config').setting,
      mongoose = require('mongoose'),
      Memo = require('../models/Memo'),
      googleMapsClient = require('@google/maps').createClient({
        key: 'AIzaSyCozWcBfuKMWt3gonOskO5n2SZMkd269WA'
      });

mongoose.Promise = require('bluebird');
mongoose.connect('mongodb+srv://gijoona:mongodb77@cluster-quester-euzkr.gcp.mongodb.net/quester', { useNewUrlParser: true, promiseLibrary: require('bluebird') })
        .then(() => console.log('connection successful!!!'))
        .catch((err) => console.error(err));

const redis = require('redis').createClient(conf.redis.port, conf.redis.ip);  // redis 모듈 로드
redis.on('error', (err) => {
  console.log(`Redis Error ${err}`);
});

exports.onRequest = function (res, method, pathname, params, cb) {
  // 메서드별로 기능 분기
  switch (method) {
    case 'POST':
      return register(method, pathname, params, (response) => {
        process.nextTick(cb, res, response);
      });
    case 'GET':
      return inquiry(method, pathname, params, (response) => {
        process.nextTick(cb, res, response);
      });
    case 'PUT':
      return modify(method, pathname, params, (response) => {
        process.nextTick(cb, res, response);
      });
    case 'DELETE':
      return unregister(method, pathname, params, (response) => {
        process.nextTick(cb, res, response);
      });
    default:
      // 정의되지 않은 메서드면 null return
      return process.nextTick(cb, res, null);
  }
}

function register (method, pathname, params, cb) {
  let parameters = params.data;
  if (parameters.geoLoc && parameters.geoLoc.length > 0) {  // geoLocation 정보가 있을 경우
    googleMapsClient.reverseGeocode({latlng: parameters.geoLoc, language: 'ko', location_type: 'ROOFTOP'}, function (err, res) {
      // TODO :: result가 없음.
      // status: 'ZERO_RESULTS'라는 결과가 출력됨. 조회 결과가 없는 이유를 확인해야할 필요가 있음
      let adress = '';
      if (res.json.results.length > 0) {
        adress = res.json.results[0].formatted_address;
      } else {
        adress = res.json.plus_code.compound_code;
      }
      console.log(adress);
      let newMemo = new Memo({
        title: parameters.title,
        contents: parameters.contents || '',
        geoLocation: {
          type: 'Point',
          coordinates: parameters.geoLoc,
          adress: adress
        }
      });
      newMemo.save(function (err, memoDoc) {
        resultProc(err, memoDoc, params, cb);
      });
    });
  } else {  // geoLocation 정보가 없을 경우
    let newMemo = new Memo({
      title: parameters.title,
      contents: parameters.contents || '',
      geoLocation: null
    });
    newMemo.save(function (err, memoDoc) {
      resultProc(err, memoDoc, params, cb);
    });
  }
}

function inquiry (method, pathname, params, cb) {
  Memo.find({}, function (err, memoDoc) {
    resultProc(err, memoDoc, params, cb);
  }).sort({seq: 'desc'});
}

function modify (method, pathname, params, cb) {
  let parameters = params.data;

  Memo.findByIdAndUpdate(parameters['_id'], parameters, function (err, memoDoc) {
    resultProc(err, memoDoc, params, cb);
  });
}

function unregister (method, pathname, params, cb) {
  let parameters = params.data,
      response = {
    key: params.key,
    errorcode: 0,
    errormessage: 'success'
  };

  if (parameters.id) {
    Memo.findByIdAndRemove(parameters.id, function (err, memoDoc) {
      resultProc(err, memoDoc, params, cb);
    });
  } else {
    fnFailed('Empty Memo Id', response, cb)
  }
}

function resultProc (err, results, params, cb) {
  let res = {
    key: params.key,
    errorcode: 0,
    errormessage: 'success'
  };
  if (err) {
    fnError(err, res, cb);
  } else if (results) {
    fnSuccess(results, res, cb);
  } else {
    fnFailed('Failed', res, cb);
  }
}

function fnError (err, res, cb) {
  console.error(err);
  res.errorcode = 1;
  res.errormessage = err;
  cb(res);
}

function fnSuccess (results, res, cb) {
  let pageInfo = { total: results.length || 0 };
  res.pageInfo = pageInfo;
  res.results = results;
  cb(res);
}

function fnFailed (msg, res, cb) {
  res.errorcode = 1;
  res.errormessage = msg;
  cb(res);
}
