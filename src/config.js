const mongoose = require('mongoose');

async function connectToDatabase() {
  const username = 'shiv'; 
  const password = 'Shiv11'; 
  const cluster = 'cluster0.hqviwwq.mongodb.net';
  const dbname = 'login';

  const uri = `mongodb+srv://${username}:${password}@${cluster}/${dbname}?retryWrites=true&w=majority`;

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

connectToDatabase();
const PartyModeSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pmode: { type: Boolean, default: false }
});
const LoginSchema=({
    name:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
    },
    isArtist:{
        type:Boolean,
        required:false,

    },
    artistName:{
        type:String,
        required:false,


    },
    artistPassword:{
        type:String,
        required:false,

    },
    requests:{
        type:String,
        required:false,

    },
    partymode: [PartyModeSchema],
     notifications: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: String,
        createdAt: { type: Date, default: Date.now }
    }],
    
});
const collections=new mongoose.model("users",LoginSchema);
module.exports=collections;

