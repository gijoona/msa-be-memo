const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

let SequenceSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});
let sequence = mongoose.model('sequence', SequenceSchema);

let GeoSchema = new Schema({
  _id: false,
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  },
  adress: {
    type: String,
    required: true
  }
});

let MemoSchema = new Schema({
  seq: {
    type: Number
  },
  title: {
    type: String,
    required: true
  },
  contents: {
    type: String
  },
  inputDt: {
    type: Date,
    default: Date.now
  },
  geoLocation: {
    type: GeoSchema
  }
});

MemoSchema.pre('save', function (next) {
  if (this.isNew) {
    let doc = this;
    sequence.findByIdAndUpdate({_id: 'memoSeq'}, { $inc: { seq: 1 } }, { upsert: true, new: true })
      .then(function (seqDoc) {
        doc.seq = seqDoc.seq;
        next();
      })
      .catch(function (err) {
        throw err;
      })
  } else {
    next();
  }
});

module.exports = mongoose.model('Memo', MemoSchema);
