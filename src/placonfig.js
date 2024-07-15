const mongoose = require('mongoose');
const playlistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    songs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Song' 
        }
    ],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const Playlist = mongoose.model('Playl', playlistSchema);

module.exports = Playlist;
