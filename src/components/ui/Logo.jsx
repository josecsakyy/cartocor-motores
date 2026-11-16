import { useState } from 'react';

const LOGO_URL = `${import.meta.env.BASE_URL}logo-cartocor.png`;

/** Logo oficial (public/logo-cartocor.png). Si falta el archivo, muestra el nombre. */
export function Logo({ className = 'h-12 w-12' }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="text-2xl font-black tracking-wide text-[#6E6E6E]">CARTOCOR</span>;
  }
  return <img src={LOGO_URL} alt="Cartocor" className={`${className} object-contain`} onError={() => setFailed(true)} />;
}
