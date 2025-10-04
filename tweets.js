const express = require('express');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Tweet = require('../models/Tweet');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { upload, checkUploadTime } = require('../middleware/audioUpload');
const { validateAudioFile } = require('../utils/audioValidator');

const router = express.Router();

// Get all tweets (feed)
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tweets = await Tweet.find()
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ tweets, page, limit });
  } catch (error) {
    console.error('Get tweets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's tweets
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tweets = await Tweet.find({ author: userId })
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ tweets, page, limit });
  } catch (error) {
    console.error('Get user tweets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create text tweet
router.post('/', auth, [
  body('content').isLength({ min: 1, max: 280 }).trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;

    const tweet = new Tweet({
      content,
      author: req.user._id
    });

    await tweet.save();
    await tweet.populate('author', 'username profilePicture');

    res.status(201).json({ tweet });
  } catch (error) {
    console.error('Create tweet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create audio tweet
router.post('/audio', auth, checkUploadTime, upload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file uploaded' });
    }

    const { content } = req.body;
    const filePath = req.file.path;

    // Validate audio file
    const audioInfo = await validateAudioFile(filePath);

    // Create audio tweet
    const tweet = new Tweet({
      content: content || '',
      author: req.user._id,
      audioFile: {
        url: `/uploads/audio/${req.file.filename}`,
        duration: audioInfo.duration,
        size: audioInfo.size,
        mimeType: audioInfo.mimeType
      },
      isAudioTweet: true
    });

    await tweet.save();
    await tweet.populate('author', 'username profilePicture');

    res.status(201).json({ tweet });
  } catch (error) {
    // Clean up uploaded file if validation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Create audio tweet error:', error);
    res.status(400).json({ message: error.message || 'Server error' });
  }
});

// Like/Unlike tweet
router.post('/:tweetId/like', auth, async (req, res) => {
  try {
    const { tweetId } = req.params;
    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    const isLiked = tweet.likes.includes(req.user._id);

    if (isLiked) {
      tweet.likes.pull(req.user._id);
    } else {
      tweet.likes.push(req.user._id);
    }

    await tweet.save();

    res.json({ 
      isLiked: !isLiked, 
      likeCount: tweet.likes.length 
    });
  } catch (error) {
    console.error('Like tweet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Retweet
router.post('/:tweetId/retweet', auth, async (req, res) => {
  try {
    const { tweetId } = req.params;
    const originalTweet = await Tweet.findById(tweetId);

    if (!originalTweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    // Check if already retweeted
    const existingRetweet = await Tweet.findOne({
      author: req.user._id,
      parentTweet: tweetId
    });

    if (existingRetweet) {
      return res.status(400).json({ message: 'Already retweeted' });
    }

    const retweet = new Tweet({
      author: req.user._id,
      parentTweet: tweetId,
      content: `Retweeted: ${originalTweet.content}`
    });

    await retweet.save();
    await retweet.populate('author', 'username profilePicture');

    res.status(201).json({ retweet });
  } catch (error) {
    console.error('Retweet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete tweet
router.delete('/:tweetId', auth, async (req, res) => {
  try {
    const { tweetId } = req.params;
    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    if (tweet.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this tweet' });
    }

    // Delete audio file if it exists
    if (tweet.audioFile && tweet.audioFile.url) {
      const filePath = path.join(__dirname, '..', '..', tweet.audioFile.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Tweet.findByIdAndDelete(tweetId);

    res.json({ message: 'Tweet deleted successfully' });
  } catch (error) {
    console.error('Delete tweet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve audio files
router.get('/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', '..', 'uploads', 'audio', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Audio file not found' });
  }
});

module.exports = router;
