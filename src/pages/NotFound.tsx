import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-grow space-y-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-xl">Página no encontrada</p>
      <Link to="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
        Volver al Inicio
      </Link>
    </div>
  );
}
