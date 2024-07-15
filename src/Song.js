const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const songSchema = new Schema({
  artist: { type: String, required: true },
  name: { type: String, required: true },
  filePath: { type: String, required: true },
  songId: { type: String, unique: true },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 }
}
,{ collection: 'cust' });


const Song = mongoose.model('Song', songSchema);

module.exports = Song;
