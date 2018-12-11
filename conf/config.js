const defaults = { "ip": process.env.NODE_ENV === 'development' ? 'localhost' : '35.200.103.250' },
      distribute = Object.assign({}, defaults, { 'ip': '35.200.103.250', port: 9000 }),
      service = Object.assign({}, defaults, { port: 10020 }),
      redis = Object.assign({}, defaults, { ip: '35.200.103.250', port: 6379 }),
      database = Object.assign({}, defaults, { url: '' }),
      setting = {
        service: service,
        distribute: distribute,
        redis: redis,
        database: database
      };

exports.setting = setting;
