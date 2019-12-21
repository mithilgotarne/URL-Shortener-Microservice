"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bodyParser = require("body-parser");
const dns = require("dns");

var cors = require("cors");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

mongoose.connect(process.env.MONGOLAB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/public", express.static(process.cwd() + "/public"));

// const CounterSchema = Schema({
//     _id: {type: String, required: true},
//     seq: { type: Number, default: 0 }
// });

// const Counter = mongoose.model('counter', CounterSchema);

const shorturlSchema = new Schema({
  url: { type: String, required: true },
  id: Number
});

// shorturlSchema.pre('save', function(next) {
//     let doc = this;
//     Counter.findByIdAndUpdate({_id: 'urlId'}, {$inc: { seq: 1} }, function(error, counter)   {
//         if(error)
//             return next(error);
//         doc.id = counter.seq;
//         next();
//     });
// });

const ShortURL = mongoose.model("ShortURL", shorturlSchema);

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl/new", function(req, res) {
  let url = req.body.url;
  // console.log(url)
  if (url) {
    url = new URL(url);
    dns.lookup(url.hostname, function(err, address, family) {
      // console.log(url, err);
      if (!err) {
        getShortURL(url)
          .then(shorturl => {
            res.json({ original_url: shorturl.url, short_url: shorturl.id });
          })
          .catch(e => {
            saveShortURL(url)
              .then(shorturl => {
                res.json({
                  original_url: shorturl.url,
                  short_url: shorturl.id
                });
              })
              .catch(e => {
                res.json({ error: "invalid Hostname" });
              });
          });
      } else {
        res.json({ error: "invalid Hostname" });
      }
    });
  } else {
    res.json({ error: "invalid Hostname" });
  }
});

const getShortURL = async url => {
  const shorturl = await ShortURL.findOne({ url });
  if (shorturl) {
    return Promise.resolve(shorturl);
  } else {
    return Promise.reject(shorturl);
  }
};

const saveShortURL = async url => {
  const count = await ShortURL.estimatedDocumentCount();
  const shorturl = new ShortURL({ url, id: count + 1 });
  try {
    await shorturl.save();
    return Promise.resolve(shorturl);
  } catch (e) {
    return Promise.reject(shorturl);
  }
};

app.get("/api/shorturl/:id", function(req, res) {
  const id = +req.params.id;

  if (isNaN(id)) {
    res.json({ error: "Wrong Format" });
  } else {
    ShortURL.findOne({ id }, function(err, shorturl) {
      if (!shorturl) {
        res.json({ error: "No short url found for given input" });
      } else {
        res.redirect(shorturl.url);
      }
    });
  }
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
