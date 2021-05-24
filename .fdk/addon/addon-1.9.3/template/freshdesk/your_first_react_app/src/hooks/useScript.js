import { useState, useEffect } from 'react';

const useScript = url => {

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = url;
    script.addEventListener('load', () => setLoaded(true));
    script.defer = true;

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    }
  }, [url]);
};

export default useScript;