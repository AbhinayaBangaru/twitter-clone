import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoginForm from '../components/LoginForm'
import RegisterForm from '../components/RegisterForm'
import OTPVerification from '../components/OTPVerification'
import TweetBox from '../components/TweetBox'
import TweetList from '../components/TweetList'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function Home() {
  const { user, loading } = useAuth()
  const [authMode, setAuthMode] = useState('login') // 'login', 'register', 'otp'
  const [registerEmail, setRegisterEmail] = useState('')
  const [tweets, setTweets] = useState([])
  const [tweetsLoading, setTweetsLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchTweets()
    }
  }, [user])

  const fetchTweets = async () => {
    setTweetsLoading(true)
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tweets`)
      setTweets(response.data.tweets)
    } catch (error) {
      console.error('Error fetching tweets:', error)
      toast.error('Failed to fetch tweets')
    } finally {
      setTweetsLoading(false)
    }
  }

  const handleTweetPosted = (newTweet) => {
    setTweets(prev => [newTweet, ...prev])
  }

  const handleTweetDeleted = (tweetId) => {
    setTweets(prev => prev.filter(tweet => tweet._id !== tweetId))
  }

  const handleRegisterSuccess = (email) => {
    setRegisterEmail(email)
    setAuthMode('otp')
  }

  const handleOTPVerified = () => {
    setAuthMode('login')
    setRegisterEmail('')
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="loading">
          <div className="spinner" />
          <span style={{ marginLeft: '12px' }}>Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%)'
      }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
          {authMode === 'login' && (
            <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
          )}
          
          {authMode === 'register' && (
            <RegisterForm 
              onSwitchToLogin={() => setAuthMode('login')}
              onRegisterSuccess={handleRegisterSuccess}
            />
          )}
          
          {authMode === 'otp' && (
            <OTPVerification 
              email={registerEmail}
              onVerified={handleOTPVerified}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000' }}>
      <div className="container" style={{ paddingTop: '20px' }}>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '20px',
          borderBottom: '1px solid #2f3336'
        }}>
          <h1 style={{ color: '#1da1f2', fontSize: '24px' }}>Twitter Clone</h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#71767b' }}>Welcome, {user.username}!</span>
            <button
              onClick={() => {
                localStorage.removeItem('user')
                window.location.reload()
              }}
              className="btn btn-outline"
            >
              Logout
            </button>
          </div>
        </header>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <TweetBox onTweetPosted={handleTweetPosted} />
          
          {tweetsLoading ? (
            <div className="loading">
              <div className="spinner" />
              <span style={{ marginLeft: '12px' }}>Loading tweets...</span>
            </div>
          ) : (
            <TweetList 
              tweets={tweets} 
              onTweetDeleted={handleTweetDeleted}
            />
          )}
        </div>
      </div>
    </div>
  )
}
