const {Adrauth} = require('./adrauth.js')

var connect = JSON.parse(fs.readFileSync("config/creds.json"))
console.log(connect)
var adrauth = new Adrauth({ mode: 'postgres', connect }, (err, resp) => {
    
    if (err) {
        console.log(err)
    } else {
        //console.log(resp)
        console.log(`Database connected!`)
        
        //load ipCache file
        if (fs.existsSync('cache/ipCache.json')) {
            //there is a cache file, load it
            console.log(`Cache file found. Loading...`);
            var preCache = JSON.parse(fs.readFileSync('cache/ipCache.json'));
            globals.knownIPs = preCache.knownIPs;
            globals.knownIPInfo = preCache.knownIPInfo;
            //cache reloaded
            console.log(`Cache file loaded!`);
        }
        
        
        
        
        
        
        
    }
})