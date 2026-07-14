"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Movie {
  id: string;
  title: string;
  poster: string;
  description: string;
  year: number;
  genre: string;
  videoQualities: {
    '480p'?: string;
    '720p'?: string;
    '1080p'?: string;
  };
  subtitleUrl?: string;
  rating: number;
}

const GENRES = ['Action', 'Drama', 'Sci-Fi', 'Comedy', 'Horror', 'Thriller'];

export default function XAPPAdmin() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    title: '',
    poster: '',
    description: '',
    year: new Date().getFullYear(),
    genre: 'Action',
    video480: '',
    video720: '',
    video1080: '',
    subtitleUrl: '',
    rating: 8.0
  });

  const [toast, setToast] = useState<{message: string; type: string} | null>(null);

  // Load movies
  useEffect(() => {
    const saved = localStorage.getItem('xapp_movies');
    if (saved) {
      setMovies(JSON.parse(saved));
    }
  }, []);

  const saveToStorage = (updated: Movie[]) => {
    setMovies(updated);
    localStorage.setItem('xapp_movies', JSON.stringify(updated));
  };

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  };

  // Handle form input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Reset form
  const resetForm = () => {
    setForm({
      title: '', poster: '', description: '', year: new Date().getFullYear(),
      genre: 'Action', video480: '', video720: '', video1080: '', subtitleUrl: '', rating: 8.0
    });
    setIsEditing(false);
    setEditingId(null);
  };

  // Add or Update movie
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.poster.trim()) {
      showToast('Title and Poster URL are required!', 'error');
      return;
    }

    // Build videoQualities object (only non-empty)
    const videoQualities: Movie['videoQualities'] = {};
    if (form.video480.trim()) videoQualities['480p'] = form.video480.trim();
    if (form.video720.trim()) videoQualities['720p'] = form.video720.trim();
    if (form.video1080.trim()) videoQualities['1080p'] = form.video1080.trim();

    if (Object.keys(videoQualities).length === 0) {
      showToast('At least one video quality link is required!', 'error');
      return;
    }

    const newMovie: Movie = {
      id: isEditing && editingId ? editingId : 'movie_' + Date.now(),
      title: form.title.trim(),
      poster: form.poster.trim(),
      description: form.description.trim() || 'No description provided.',
      year: parseInt(form.year.toString()),
      genre: form.genre,
      videoQualities,
      subtitleUrl: form.subtitleUrl.trim() || undefined,
      rating: parseFloat(form.rating.toString()) || 7.5
    };

    let updatedMovies: Movie[];
    
    if (isEditing && editingId) {
      updatedMovies = movies.map(m => m.id === editingId ? newMovie : m);
      showToast('Movie updated successfully!');
    } else {
      updatedMovies = [...movies, newMovie];
      showToast('Movie added to library! 🎉');
    }

    saveToStorage(updatedMovies);
    resetForm();
  };

  // Edit movie - load into form
  const startEdit = (movie: Movie) => {
    setForm({
      title: movie.title,
      poster: movie.poster,
      description: movie.description,
      year: movie.year,
      genre: movie.genre,
      video480: movie.videoQualities['480p'] || '',
      video720: movie.videoQualities['720p'] || '',
      video1080: movie.videoQualities['1080p'] || '',
      subtitleUrl: movie.subtitleUrl || '',
      rating: movie.rating
    });
    setIsEditing(true);
    setEditingId(movie.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete movie
  const deleteMovie = (id: string) => {
    if (!confirm('Delete this movie permanently?')) return;
    
    const updated = movies.filter(m => m.id !== id);
    saveToStorage(updated);
    showToast('Movie deleted');
    
    // If editing this movie, reset form
    if (editingId === id) resetForm();
  };

  // Quick add demo movies again
  const loadDemoMovies = () => {
    const demo: Movie[] = [
      {
        id: 'demo1', title: "Midnight Chase", poster: "https://picsum.photos/id/1015/300/400",
        description: "A high-octane action thriller about a skilled driver who gets pulled into a dangerous underground racing syndicate.",
        year: 2024, genre: "Action",
        videoQualities: { '480p': "https://samplelib.com/mp4/sample-15s.mp4", '720p': "https://samplelib.com/mp4/sample-15s.mp4", '1080p': "https://samplelib.com/mp4/sample-15s.mp4" },
        rating: 8.7
      },
      {
        id: 'demo2', title: "Echoes of Tomorrow", poster: "https://picsum.photos/id/1005/300/400",
        description: "In a dystopian future, a young scientist discovers a way to communicate with parallel versions of herself.",
        year: 2023, genre: "Sci-Fi",
        videoQualities: { '480p': "https://samplelib.com/mp4/sample-10s.mp4", '720p': "https://samplelib.com/mp4/sample-10s.mp4" },
        rating: 9.1
      }
    ];
    
    const merged = [...movies.filter(m => !m.id.startsWith('demo')), ...demo];
    saveToStorage(merged);
    showToast('Demo movies loaded!');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Admin Navbar */}
      <nav className="border-b border-zinc-800 bg-zinc-950/95 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                <span className="font-bold text-xl">X</span>
              </div>
              <span className="font-bold text-2xl tracking-tighter">XAPP</span>
            </Link>
            <div className="px-3 py-1 text-xs bg-red-600/10 text-red-500 border border-red-600/30 rounded-full font-mono tracking-widest">ADMIN PANEL</div>
          </div>
          
          <Link href="/" className="text-sm px-5 py-2 hover:bg-zinc-900 rounded-full border border-zinc-700 transition-colors flex items-center gap-2">
            ← Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold tracking-tighter">XAPP Admin</h1>
            <p className="text-zinc-400 mt-2">Add movies using direct links • Poster + Video + Subtitles</p>
          </div>
          <button 
            onClick={loadDemoMovies}
            className="hidden md:block px-5 py-2 text-sm border border-zinc-700 hover:bg-zinc-900 rounded-full transition-colors"
          >
            Load Demo Movies
          </button>
        </div>

        {/* ADD / EDIT FORM */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">{isEditing ? 'Edit Movie' : 'Add New Movie to Library'}</h2>
            {isEditing && (
              <button onClick={resetForm} className="text-sm text-red-500 hover:underline">Cancel Edit</button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1.5">MOVIE TITLE *</label>
                <input 
                  name="title" value={form.title} onChange={handleChange} required
                  className="admin-input w-full px-4 py-3 rounded-2xl text-lg" 
                  placeholder="e.g. Inception" 
                />
              </div>

              {/* Year & Genre */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1.5">YEAR</label>
                  <input 
                    type="number" name="year" value={form.year} onChange={handleChange}
                    className="admin-input w-full px-4 py-3 rounded-2xl" min="1900" max="2030"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1.5">GENRE</label>
                  <select name="genre" value={form.genre} onChange={handleChange} className="admin-input w-full px-4 py-3 rounded-2xl">
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Poster Direct Link */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1.5">POSTER IMAGE DIRECT LINK *</label>
              <input 
                name="poster" value={form.poster} onChange={handleChange} required
                className="admin-input w-full px-4 py-3 rounded-2xl font-mono text-sm" 
                placeholder="https://picsum.photos/id/1015/300/400  or your direct image URL (jpg/png/webp)" 
              />
              <p className="text-[10px] text-zinc-500 mt-1">Use direct image links (Imgur, Picsum, your hosted image, etc.)</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1.5">DESCRIPTION / ABOUT</label>
              <textarea 
                name="description" value={form.description} onChange={handleChange} rows={3}
                className="admin-input w-full px-4 py-3 rounded-2xl resize-y min-h-[90px]" 
                placeholder="Short description about the movie plot..."
              />
            </div>

            {/* Video Direct Links - 3 Qualities */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-3">MOVIE VIDEO DIRECT LINKS (at least 1 required)</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-zinc-400 mb-1 pl-1">480p Quality</div>
                  <input name="video480" value={form.video480} onChange={handleChange}
                    className="admin-input w-full px-4 py-3 rounded-2xl font-mono text-xs" 
                    placeholder="https://.../movie-480p.mp4" />
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1 pl-1">720p Quality</div>
                  <input name="video720" value={form.video720} onChange={handleChange}
                    className="admin-input w-full px-4 py-3 rounded-2xl font-mono text-xs" 
                    placeholder="https://.../movie-720p.mp4" />
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1 pl-1">1080p Quality</div>
                  <input name="video1080" value={form.video1080} onChange={handleChange}
                    className="admin-input w-full px-4 py-3 rounded-2xl font-mono text-xs" 
                    placeholder="https://.../movie-1080p.mp4" />
                </div>
              </div>
              <p className="text-[10px] text-emerald-600/70 mt-2 pl-1">Supports any direct MP4 link. Quality switching works in player.</p>
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1.5">SUBTITLE FILE (VTT) DIRECT LINK (OPTIONAL)</label>
              <input 
                name="subtitleUrl" value={form.subtitleUrl} onChange={handleChange}
                className="admin-input w-full px-4 py-3 rounded-2xl font-mono text-sm" 
                placeholder="https://yourdomain.com/subtitles/movie-en.vtt" 
              />
              <p className="text-[10px] text-zinc-500 mt-1">Upload .vtt file somewhere public (GitHub raw, Vercel, etc.) and paste link here. Subtitles will appear automatically in player.</p>
            </div>

            {/* Rating */}
            <div className="max-w-[140px]">
              <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1.5">RATING (1-10)</label>
              <input type="number" step="0.1" min="1" max="10" name="rating" value={form.rating} onChange={handleChange}
                className="admin-input w-full px-4 py-3 rounded-2xl" />
            </div>

            <button 
              type="submit"
              className="w-full mt-4 py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all font-semibold text-lg rounded-2xl shadow-xl"
            >
              {isEditing ? 'UPDATE MOVIE' : 'ADD MOVIE TO XAPP LIBRARY'}
            </button>
          </form>
        </div>

        {/* Current Library */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-2xl font-semibold">Current Library ({movies.length} movies)</h3>
            <Link href="/" className="text-red-500 text-sm flex items-center gap-1 hover:underline">View on site →</Link>
          </div>

          {movies.length === 0 ? (
            <div className="border border-zinc-800 rounded-3xl p-12 text-center">
              <div className="text-6xl mb-4">📽️</div>
              <p className="text-xl">No movies yet. Add your first movie above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {movies.map(movie => (
                <div key={movie.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex gap-5 group">
                  <img 
                    src={movie.poster} 
                    alt={movie.title} 
                    className="w-24 h-32 object-cover rounded-xl flex-shrink-0 border border-zinc-700" 
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/id/1015/300/400'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xl tracking-tight pr-8">{movie.title}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{movie.year} • {movie.genre} • ⭐ {movie.rating}</div>
                    
                    <div className="mt-2 text-xs text-zinc-400 line-clamp-2">{movie.description}</div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.keys(movie.videoQualities).map(q => (
                        <span key={q} className="text-[10px] px-2.5 py-px bg-zinc-800 rounded font-mono text-zinc-400">{q}</span>
                      ))}
                      {movie.subtitleUrl && <span className="text-[10px] px-2.5 py-px bg-emerald-950 text-emerald-400 rounded font-mono">SUBTITLES</span>}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => startEdit(movie)}
                        className="text-xs px-5 py-2 border border-zinc-600 hover:bg-zinc-800 rounded-full transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteMovie(movie.id)}
                        className="text-xs px-5 py-2 border border-red-900/60 hover:bg-red-950 text-red-400 hover:text-red-300 rounded-full transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-2xl shadow-2xl text-sm font-medium z-[90] ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="text-center pb-10 text-[10px] text-zinc-500">
        XAPP Admin • Data saved in your browser (localStorage) • Deploy this full project on Vercel
      </div>
    </div>
  );
}
