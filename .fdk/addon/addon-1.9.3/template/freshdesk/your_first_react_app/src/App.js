import React, { useState, useEffect } from 'react';
import './App.css';
import HelloUser from './components/HelloUser'

const App = () => {

  const [loaded, setLoaded] = useState(false);
  const [child, setChild] = useState(<h3>App is loading</h3>)

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://static.freshdev.io/fdk/2.0/assets/fresh_client.js';
    script.addEventListener('load', () => setLoaded(true));
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded) return
    app.initialized().then((client) => {
      setChild((<HelloUser client={client} />))
    })
  }, [loaded])

  return (
    <div>
      {child}
    </div>
  )
}

export default App;
