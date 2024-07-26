// const jwt = require('jsonwebtoken');
// const SECRET_KEY = '10112126'; 


// function generateToken(user) {
//     return jwt.sign({ id: user._id, name: user.name }, SECRET_KEY, { expiresIn: '1h' });
// }
// function verifyToken(req, res, next) {
//     const token = req.headers['authorization'];
//     if (!token) {
//         return res.status(403).send('Token is required');
//     }
//     jwt.verify(token, SECRET_KEY, (err, decoded) => {
//         if (err) {
//             return res.status(401).send('Invalid Token');
//         }
//         req.user = decoded;
//         next();
//     });
// }

// module.exports = { generateToken, verifyToken };
