// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient'; // Ensure this path matches your project
import './LoginPage.css'; // You can reuse your existing CSS structure

const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  // Optional Health Stats
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // --- SIGN UP FLOW ---
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data?.user) {
          // Create the profile entry with optional stats
          // Note: We use the user.id returned from auth as the primary key
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                email: email,
                username: username,
                age: age ? parseInt(age) : null,
                weight: weight ? parseFloat(weight) : null,
                height: height ? parseFloat(height) : null,
              }
            ]);

          if (profileError) {
            console.error('Error creating profile:', profileError);
            // We don't block the user here, but we show a warning
            setError('Account created, but failed to save profile details.');
          } else {
            // Success
            navigate('/'); // Or navigate to a 'welcome' page
          }
        } else {
          // If email confirmation is enabled in Supabase, data.user might be null or session null
          setError('Please check your email to confirm your account.');
        }

      } else {
        // --- SIGN IN FLOW ---
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // Login successful
        navigate('/'); 
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        
        {/* Header / Logo Section */}
        <div className="login-header">
          <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="login-subtitle">
            {isSignUp 
              ? 'Join us to track your health journey' 
              : 'Sign in to access your dashboard'}
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          
          {/* Username - Only for Sign Up */}
          {isSignUp && (
            <div className="form-group">
              <label>Username <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          {/* Email - Both */}
          <div className="form-group">
            <label>Email <span className="required">*</span></label>
            <input
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password - Both */}
          <div className="form-group">
            <label>Password <span className="required">*</span></label>
            <input
              type="password"
              className="form-input"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {/* Optional Stats - Only for Sign Up */}
          {isSignUp && (
            <div className="optional-stats-section">
              <div className="info-note">
                <small>
                  <strong>Note:</strong> We use the details below for more accurate 
                  health measurements. You don't have to fill them out if you don't want to.
                </small>
              </div>

              <div className="stats-grid">
                <div className="form-group">
                  <label>Age (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Years"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Weight (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="kg"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Height (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="cm"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="login-switch">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button 
              type="button" 
              className="btn-link" 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;