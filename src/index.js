const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const collection = require('./config.js');
const Song = require('./Song'); 
const session = require('express-session');
const { isNullOrUndefined } = require('util');
const Playlist = require('./placonfig.js'); 
const artist=require('./Song.js');
const multer=require('multer');
const moment = require('moment');
const MongoStore = require('connect-mongo');
const http = require('http');
const socketIO = require('socket.io');


const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3001; 


app.set('view engine', 'ejs');
app.set('views', './views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
// MongoDB connection URI
const username = 'shiv';
const password = 'Shiv11';
const cluster = 'cluster0.hqviwwq.mongodb.net';
const dbname = 'login';
const MONGO_URI = `mongodb+srv://${username}:${password}@${cluster}/${dbname}?retryWrites=true&w=majority`;

app.use(session({
    secret: 'your-secret-key', // Secret key for signing the cookie
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create a session until something is stored
    store: MongoStore.create({ 
        mongoUrl: MONGO_URI, // MongoDB URI for session storage
        collectionName: 'sessions' 
    }),
        cookie: {
            secure: false, // Set to true if using HTTPS
            httpOnly: true, // Prevent JavaScript access to cookies
            sameSite: 'lax', // Ensures cookies are sent in a same-site context
            maxAge: 24 * 60 * 60 * 1000 // Cookie expiry time (24 hours)
        }
}));
app.use((req, res, next) => {
    console.log('Session ID:', req.sessionID);
    console.log('Session Data:', req.session);
    next();
});


// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');

        const directoryPath = '/Users/shivvelavan/Desktop/plsiam/src/allsongs';

        
        fs.readdir(directoryPath, async (err, files) => {
            if (err) {
                console.error('Error reading directory:', err);
                return;
            }

            console.log('Files found:', files);

            for (const file of files) {
                const filePath = path.join(directoryPath, file);
                console.log('File path:', filePath);
                const fileName = path.parse(file).name;
                const [artist, name] = fileName.split('_'); 
                console.log('Artist:', artist);
                console.log('Song Name:', name);

                try {
                    
                    const existingSong = await Song.findOne({ artist: artist, name: name });

                    if (existingSong) {
                        console.log(`Song ${name} by ${artist} already exists, skipping...`);
                    } else {
                        const newSong = new Song({
                            artist: artist,
                            name: name,
                            filePath: filePath,
                            songId: generateSongId(),
                            likes:0,
                            dislikes:0
                            
                        });

                        await newSong.save();
                        console.log('Song saved:', newSong);
                    }
                } catch (error) {
                    console.error('Error saving or checking song:', error);
                }
            }
        });
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });
    const PartyModeSchema = new mongoose.Schema({
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        pmode: { type: Boolean, default: false }
      });
      const historySchema=[{
        artist: String,
        names:[String],
        count: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now }
    }]

const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    isArtist:Boolean,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    dislikes:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    requests: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to the sender user
        message: String,
        createdAt: { type: Date, default: Date.now }
    }],
     friends:[String],
     partymode: [PartyModeSchema],
     notifications: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: String,
        createdAt: { type: Date, default: Date.now }
        
    }],
    currentPlayingsong:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    history:
    [{
        artist: String,
        names:[String],
        count: { type: Number, default: 0 },
       
    }]
});


app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});
const User = mongoose.model('User', userSchema);

app.post('/api/current-playing', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { songId,status } = req.body;

        console.log(`User ID: ${userId} - Currently playing song ID: ${songId} ${status}`);
 
        await User.findByIdAndUpdate(userId, { $set: { currentPlayingsong: [songId] } });

        res.json({ success: true, message: 'Current playing song updated successfully.' });
    } catch (error) {
        console.error('Error updating current playing song:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.get('/api/current-playing-getting', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const friend = req.query.friend;
        console.log(`User ID: ${userId}`);
        console.log(`Friend: ${friend}`);

        
        const userfriend = await User.findOne({ name: friend }).exec();
        const currentPlayingSongId = userfriend.currentPlayingsong;
        console.log(currentPlayingSongId);
        const currentSong = await Song.findById(currentPlayingSongId).select('name').exec();
        console.log(currentSong);
        if (!currentSong) {
            return res.status(404).json({ success: false, message: 'Song not found' });
        }
        res.json({ success: true, songName: currentSong.name });
    }
     catch (error) {
        console.error('Error fetching current playing song:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


app.get('/api/history/total-count', isAuthenticated, async (req, res) => {
    const userId = req.session.user._id;

    try {
        const user = await User.findById(userId).select('history').exec();
        if (!user || !user.history) {
            return res.json({ success: true, totalCount: 0 });
        }
        const totalCount = user.history.reduce((sum, entry) => sum + entry.count, 0);
        const percentages = user.history.map(entry => ({
            artist: entry.artist,
            count: entry.count,
            percentage: (entry.count / totalCount) * 100,
            names:entry.names,
        }));
        console.log(percentages);
        console.log(totalCount);
        res.json({ success: true, totalCount,percentages });
    } catch (error) {
        console.error('Error fetching total count:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// io.on('connection', (socket) => {
//     console.log('A user connected');
  
//     // Handle playback events
//     socket.on('play', (data) => {
//       io.emit('play', data);
//     });
  
//     socket.on('pause', (data) => {
//       io.emit('pause', data);
//     });
  
//     socket.on('seek', (data) => {
//       io.emit('seek', data);
//     });
  
//     socket.on('disconnect', () => {
//       console.log('A user disconnected');
//     });
//   });
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    socket.on('sync-playback', (data) => {
        io.emit('sync-playback', data);
    });
});
  

app.post('/api/history', isAuthenticated, async (req, res) => {
    const userId = req.session.user._id;
    const { songId } = req.body;

    try {
        
        const song = await Song.findById(songId).select('name artist').exec();
        if (!song) {
            return res.status(404).json({ success: false, message: 'Song not found' });
        }

        const artist = song.artist;
        const name = song.name;

        
        const user = await User.findById(userId).exec();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        
        if (!user.history) {
            user.history = [];
        }


        
        const artistEntry = user.history.find(entry => entry.artist === artist);

        if (artistEntry) {
            if (!artistEntry.names.includes(name)) {
                artistEntry.names.push(name);
            }

            artistEntry.count += 1;
        } else {
           
            user.history.push({ artist: artist, count: 1, names: [name] ,createdAt: new Date()});
    }
        await user.save();

        res.json({ success: true, message: 'Song artist and name added to history.' });
    } catch (error) {
        console.error('Error updating user history:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


function generateSongId() {
    return Math.random().toString(36).substring(7);
}
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        console.log("noooo");
        res.redirect('/login');
    }
}
app.use('/audio', express.static(path.join(__dirname, 'src', 'allsongs')));

app.get('/songs', isAuthenticated, async (req, res) => {

    try {
        const songs = await Song.find();
        const userId = req.session.user._id;
        const userDat = await User.findById(userId).exec();
        const userData = await User.findById(userId).populate('likes dislikes');
        const likedSongs = userData.likes.map(song => song._id.toString());
        const dislikedSongs = userData.dislikes.map(song => song._id.toString());
        let isartist = userDat.isArtist 
        //false; 
       
       
    res.render('songs',{songs,likedSongs,dislikedSongs,isartist});
    } catch (err) {
        console.error('Error fetching songs:', err);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/upload',(req,res)=>{
    res.render("artlogin");
})
app.post('/upload',(req,res)=>{
    const data = {
        name: req.body.artistname,
        password: req.body.artistpassword,
    }
});
app.post('/api/accept-friend-request', isAuthenticated, async (req, res) => {
    try {
        const { username } = req.body;
        const userId = req.session.user._id;
        console.log(username);
        console.log(userId);
        const requestingUser = await User.findOne({ name: `${username}` }).exec();
        console.log(requestingUser);
        if (!requestingUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        await User.findByIdAndUpdate(userId, {
            $push: { friends: username },
            $pull: { requests: { sender: requestingUser._id } } 
        });
        await User.findByIdAndUpdate(requestingUser._id, {
            $push: { friends: userId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
app.get('/audio/:id', isAuthenticated, async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).send('Song not found');
        }

        const filePath = song.filePath;
        console.log('Requested file path:', filePath);
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error fetching or streaming audio:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render("login");
});

app.get('/artist/upload', isAuthenticated, (req, res) => {
    res.render("artist", { message: null });
});

app.get('/signup', (req, res) => {
    res.render("signup");
});

app.get('/home', isAuthenticated, (req, res) => {
    res.render("home");
});

app.get('/search', isAuthenticated, async (req, res) => {
    const query = req.query.query;
    try {
        
        const searchedSongs = await Song.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { artist: { $regex: query, $options: 'i' } }
            ]
        });
        const remainingSongs = await Song.find({
            $and: [
                { name: { $not: { $regex: query, $options: 'i' } } },
                { artist: { $not: { $regex: query, $options: 'i' } } }
            ]
        });

        
        const songs = [...searchedSongs, ...remainingSongs];
        const likedSongs = req.session.user.likes;
        const dislikedSongs = req.session.user.dislikes;

        
        res.render('songs', { songs, likedSongs, dislikedSongs });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/api/friend-requests', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId).select('requests').exec();
        console.log(user);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const requestUserIds = user.requests.flatMap(request => request.sender);
        console.log(requestUserIds);
        const requestUsernames = await User.find({
            _id: { $in: requestUserIds,$ne:userId }
        }).select('name');
        console.log(requestUsernames)
        const usernames = requestUsernames.map(user => user.name);


        res.json({ usernames });
    } catch (error) {
        console.error('Error fetching friend requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.get('/api/friends', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user._id;

        console.log(`Current user ID: ${userId}`);
        const user = await User.findById(userId).exec();
        console.log("User document:", user);

        if (!user) {
            console.error('User not found');
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const friendsUsernames = user.friends;
        console.log(`Friends IDs: ${JSON.stringify(friendsUsernames)}`);

        // Separate valid and invalid IDs
        const { validFriendIds, invalidFriendIds } = friendsUsernames.reduce((acc, id) => {
            if (mongoose.Types.ObjectId.isValid(id)) {
                acc.validFriendIds.push(new mongoose.Types.ObjectId(id));
            } else {
                acc.invalidFriendIds.push(id);
            }
            return acc;
        }, { validFriendIds: [], invalidFriendIds: [] });

        console.log(`Valid friend IDs: ${JSON.stringify(validFriendIds)}`);
        console.log(`Invalid friend IDs: ${JSON.stringify(invalidFriendIds)}`);

        let friendNames = [];

        try {
            // Query for friends with valid IDs
            const friends = await User.find({ _id: { $in: validFriendIds } }).select('name').exec();
            console.log("Friends documents:", friends);
            friendNames = friends.map(friend => friend.name);
        } catch (error) {
            console.error('Error fetching friend names:', error);
        }

        // Include invalid IDs in the result
        friendNames = [...friendNames, ...invalidFriendIds];

        console.log(`Friends' names and IDs: ${JSON.stringify(friendNames)}`);
        res.json({ friends: friendNames });
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});








// app.post('/api/party-mode', isAuthenticated, async (req, res) => {
//     try {
//         const { friend } = req.body;
//         console.log("plsssssssssssssss");
//         console.log(req.body);
//         const userId = req.session.user._id;
//         const user = await User.findById(userId).exec();
//         console.log(user);
//         const friendUser = await User.findOne({ name:friend}).exec();
//         console.log(friendUser);

//         if (!user || !friendUser) {
//             return res.status(404).json({ success: false, message: 'User or friend not found' });
//         }
//         const friendUserid = await User.findOne({ name: friend }).select('_id').exec();

//         user.partymode.push({ sender: friendUserid, pmode: true });
//         friendUser.partymode.push({ sender: userId, pmode: true });

//         res.json({ success: true, message: 'Party Mode notification sent to friend' });
//     } catch (error) {
//         console.error('Error sending Party Mode notification:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// });
app.post('/api/party-mode', isAuthenticated, async (req, res) => {
    try {
        const { friend } = req.body;
        const userId = req.session.user._id;
        const user = await User.findById(userId).exec();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Find the friend user and retrieve their ID
        const friendUser = await User.findOne({ name: friend }).exec();
        if (!friendUser) {
            return res.status(404).json({ success: false, message: 'Friend not found' });
        }

        const friendUserId = friendUser._id;

        // Toggle Party Mode for both users
        const userPartyModeIndex = user.partymode.findIndex(pm => pm.sender.equals(friendUserId));
        const friendPartyModeIndex = friendUser.partymode.findIndex(pm => pm.sender.equals(userId));

        if (userPartyModeIndex !== -1) {
            // Update existing entry
            user.partymode[userPartyModeIndex].pmode = !user.partymode[userPartyModeIndex].pmode;
        } else {
            // Add new entry
            user.partymode.push({ sender: friendUserId, pmode: true });
        }

        if (friendPartyModeIndex !== -1) {
            // Update existing entry
            friendUser.partymode[friendPartyModeIndex].pmode = !friendUser.partymode[friendPartyModeIndex].pmode;
        } else {
            // Add new entry
            friendUser.partymode.push({ sender: userId, pmode: true });
        }

        await user.save();
        await friendUser.save();
        const notificationMessage = `${user.name} has requested Party Mode.`;
        friendUser.notifications.push({
            sender: userId,
            message: notificationMessage
        });
        await friendUser.save();

        res.json({ success: true, message: 'Party Mode updated successfully' });
    } catch (error) {
        console.error('Error updating Party Mode:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


// app.post('/api/party-mode', isAuthenticated, async (req, res) => {
//     try {
//         const { friend } = req.body;
//         const userId = req.session.user._id;

//         const user = await User.findById(userId).exec();
//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }

//         const friendUser = await User.findOne({ name: friend }).exec();
//         if (!friendUser) {
//             return res.status(404).json({ success: false, message: 'Friend not found' });
//         }

//         const friendUserId = friendUser._id;

//         const userPartyModeIndex = user.partymode.findIndex(pm => pm.sender.equals(friendUserId));
//         const friendPartyModeIndex = friendUser.partymode.findIndex(pm => pm.sender.equals(userId));

//         if (userPartyModeIndex !== -1) {
//             user.partymode[userPartyModeIndex].pmode = !user.partymode[userPartyModeIndex].pmode;
//         } else {
//             user.partymode.push({ sender: friendUserId, pmode: true });
//         }

//         if (friendPartyModeIndex !== -1) {
//             friendUser.partymode[friendPartyModeIndex].pmode = !friendUser.partymode[friendPartyModeIndex].pmode;
//         } else {
//             friendUser.partymode.push({ sender: userId, pmode: true });
//         }

//         await user.save();
//         await friendUser.save();

//         const notificationMessage = `${user.name} has requested Party Mode.`;
//         friendUser.notifications.push({
//             sender: userId,
//             message: notificationMessage,
//             type: 'party-mode-request'
//         });

//         await friendUser.save();

//         res.json({ success: true, message: 'Party Mode updated successfully' });
//     } catch (error) {
//         console.error('Error updating Party Mode:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// });

// Backend endpoint to fetch notifications
app.get('/api/user/notifications', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user._id;

        // Find the user by ID and populate notifications
        const user = await User.findById(userId).populate('notifications.sender').exec();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Extract relevant notification data
        const notifications = user.notifications.map(notification => ({
            message: notification.message,
            createdAt: notification.createdAt,
            senderName: notification.sender.name, // Assuming sender has a 'name' field
        }));

        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// Example backend endpoint to handle notification acceptance
app.post('/api/user/notifications/:id/accept', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user._id;

        // Find user and update notification acceptance logic
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'Notification accepted' }); 

    } catch (error) {
        console.error('Error accepting notification:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});



app.post('/sendrequest/:userId', isAuthenticated, async (req, res) => {
    const senderUserId = req.session.user._id; 
    const recipientUserId = req.params.userId;
    const message = req.body.message; 
    console.log(senderUserId);
   if(senderUserId===recipientUserId){
    return res.status(404).send('cant send request to urself');

   }
    try {
        
        const recipientUser = await User.findById(recipientUserId);
        if (!recipientUser) {
            return res.status(404).send('Recipient user not found');
        }
        const request = {
            sender: senderUserId, 
            message: message,
            createdAt: new Date()
        };
        console.log(request);
        console.log(recipientUser);
        recipientUser.requests.push(request);
        await recipientUser.save();

        console.log(`Request sent from ${senderUserId} to ${recipientUserId}`);
        res.send('Request sent successfully'); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/searchuser', isAuthenticated, async (req, res) => {
    const query = req.query.query;

    try {
        const searchedUsers = await User.find({
            name: { $regex: query, $options: 'i' } 
        });
        if (searchedUsers.length > 0) {
            console.log(`Users found for query "${query}":`, searchedUsers);
        } else {
            console.log(`No users found for query "${query}".`);
        }
        res.render('searchResults', { users: searchedUsers, query }); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});




















app.post('/save-playlist', isAuthenticated, async (req, res) => {
    const name = req.body.playlistName;
    const songs=req.body.selectedSongs
    console.log(req.body);
    const userId = req.session.user._id;

    console.log(name);
    try {
        if (!name) {
            return res.status(400).json({ error: 'Playlist name is required' });
        }

        const playlist = new Playlist({
            name,
            songs,
            user: userId 
        });

        await playlist.save();
        res.status(200).json({ message: 'Playlist saved successfully' });
    } catch (err) {
        console.error('Error saving playlist:', err);
        res.status(500).json({ error: 'Error saving playlist' });
    }
     
});

app.get('/playlists', isAuthenticated, async (req, res) => {
    const userId = req.session.user._id;
    const userData = await User.findById(userId).populate('likes');
    const likedSongs = userData.likes.map(song => song._id.toString());
    const playlistName = "liked songs";

    try {
        await Playlist.deleteMany({ user: userId, name: playlistName });
        const playlist = new Playlist({
            name: playlistName,
            songs: likedSongs,
            user: userId
        });
        await playlist.save();
        const playlists = await Playlist.find({ user: userId }).populate('songs');
        playlists.forEach(playlist => {
            let totalDuration = 0;
            playlist.songs.forEach(song => {
                totalDuration += song.duration || 0; 
            });
            playlist.totalDuration = totalDuration; 
        });
        console.log(playlist.totalDuration);

        res.json(playlists);
    } catch (err) {
        console.error('Error handling playlists:', err);
        res.status(500).json({ error: 'Error handling playlists' });
    }
});

app.get('/playlists/:id/songs', isAuthenticated, async (req, res) => {
    const playlistId = req.params.id;

    try {
        const playlist = await Playlist.findById(playlistId).populate('songs');
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        
        let totalDuration = 0; // in seconds

        res.json( playlist.songs );
    } catch (err) {
        console.error('Error fetching playlist songs:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/submit-options', async (req, res) => {
    const { songId, option1, option2 } = req.body;
    console.log("shivu");
    console.log(songId);
    console.log(option1);
    try {
        const song = await Song.findById(songId);
        console.log(song);

        if (!song) {
            return res.status(404).send('Song not found');
        }
        if (option1 === '1') {
            console.log("yes");
            song.likes++;
            song.dislikes = Math.max(0, song.dislikes - 1); 
        } else if (option2 === '1') {
            song.dislikes++;
            song.likes = Math.max(0, song.likes - 1); 
        }

        await song.save(); 
        if (req.session.user) {
            console.log("crct user");
            const userId = req.session.user._id;
            const user = await User.findById(userId);

            if (option1 === '1' && !user.likes.includes(song._id)) {
                console.log("pushed");
                user.likes.push(song._id);
                user.dislikes = user.dislikes.filter(id => !id.equals(song._id));
            } else if (option2 === '1' && !user.dislikes.includes(song._id)) {
                user.dislikes.push(song._id);
                user.likes = user.likes.filter(id => !id.equals(song._id));
            } else if (option1 ===null && option2 ===null) {
                user.likes = user.likes.filter(id => !id.equals(song._id));
                user.dislikes = user.dislikes.filter(id => !id.equals(song._id));
            }

            await user.save(); 
        }
        console.log(song.likes);
        res.status(200).json({ likes: song.likes, dislikes: song.dislikes });
    } catch (error) {
        console.error('Error updating song or user:', error);
        res.status(500).send('Internal Server Error');
    }
});























app.post('/signup', async (req, res) => {
    try {
        const { username, password, isArtist, artistName, artistPassword } = req.body;
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{3,}$/;

       
        const existingUser = await collection.findOne({ name: username });
        if (existingUser) {
            return res.send('<script>alert("Username already exists. Please choose a different username."); window.location.href = "/signup";</script>');
        }
        if(username.length<2){
            
            return res.send('<script>alert("Username has only 3 characters. Please choose a different username."); window.location.href = "/signup";</script>')
        }
        if (!passwordRegex.test(password) || password.length<2) {
            return res.send('<script>alert("Password must be at least 3 characters long, contain at least one uppercase letter, and one special symbol"); window.location.href = "/signup";</script>');
          }
        const isArtistBool = isArtist === 'on';
        console.log(isArtistBool);
        const userData = {
            name: username,
            password: await bcrypt.hash(password, 10), 
            isArtist: isArtistBool,
        };
        if (isArtistBool) {
            console.log("shivu");
            userData.artistName = artistName;
            console.log(artistName);
            userData.artistPassword = artistPassword ? await bcrypt.hash(artistPassword, 10) : null;
        }
        console.log(userData);
        
        await collection.insertMany(userData);
        res.redirect('/login');
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('Internal Server Error');
    }
});


const uploadDir = path.join(__dirname, 'allsongs');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const artistName = req.body.musicNameArtist; 
        const musicName = req.body.musicName;
        const fileName = `${artistName}_${musicName}${path.extname(file.originalname)}`;
        cb(null, fileName);
    }
});


const upload = multer({ storage: storage });
console.log(upload);

app.post('/artist/upload', isAuthenticated, upload.single('musicFile'), async (req, res) => {
    const { musicNameArtist, musicName } = req.body;
    const filePath = req.file.path; 

    try {
        const newSong = new Song({
            artist: musicNameArtist,
            name: musicName,
            filePath: filePath,
            songId: generateSongId(), 
            likes: 0,
            dislikes: 0
        });

        await newSong.save();
        res.redirect('/songs');
        
        

    } catch (err) {
        console.error('Error uploading song:', err);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/api/user/name', async (req, res) => {
    try {
        const userId = req.session.user._id; 
        const user = await User.findById(userId).select('name');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        console.log(user);

        res.json({ success: true, name: user.name });
    } catch (error) {
        console.error('Error fetching user name:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/login', async (req, res) => {
    const data = {
        name: req.body.username,
        password: req.body.password,
    }
    try {
        const check = await collection.findOne({ name: data.name });

        if (!check) {
            return res.send('<script>alert("Username does not exist. Please enter it correctly."); window.location.href = "/login";</script>');
        }

        const match = await bcrypt.compare(data.password, check.password);

        if (!match) {
            return res.send('<script>alert("Password is wrong. Please enter it correctly."); window.location.href = "/login";</script>');
        } else {
            req.session.user = check;
            const userId = req.session.user._id;
            const userData = await User.findById(userId).populate('likes dislikes');
            const likedSongs = userData.likes.map(song => song._id.toString());
            const dislikedSongs = userData.dislikes.map(song => song._id.toString());
            res.redirect('/songs');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Unable to logout');
        }

        res.clearCookie('connect.sid', { path: '/', maxAge: 0 }); 
        res.redirect('/login'); 
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});