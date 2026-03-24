'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './bookmark.module.css';
import { supabase } from '../supabase-client';

const BookmarksPage = () => {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBookmark, setNewBookmark] = useState({ title: '', url: '', category: 'Development' });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Development', 'Design', 'News', 'Entertainment', 'Other'];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchBookmarks = async () => {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookmarks:', error);
      } else {
        setBookmarks(data || []);
      }
    };

    fetchBookmarks();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('bookmarks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Change received!', payload);

          if (payload.eventType === 'INSERT') {
            setBookmarks(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            console.log('Deleting bookmark with ID:', deletedId);
            if (deletedId) {
              setBookmarks(prev => prev.filter(b => b.id !== deletedId));
            }
          } else if (payload.eventType === 'UPDATE') {
            setBookmarks(prev => prev.map(b => b.id === payload.new.id ? payload.new : b));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAddBookmark = async (e) => {
    e.preventDefault();

    if (!newBookmark.title || !newBookmark.url || !user) return;

    let validUrl = newBookmark.url;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .insert([
        {
          user_id: user.id,
          title: newBookmark.title,
          url: validUrl,
          category: newBookmark.category
        }
      ])
      .select();

    if (error) {
      console.error('Error adding bookmark:', error);
      alert('Failed to add bookmark. Please try again.');
    } else {
      setNewBookmark({ title: '', url: '', category: 'Development' });
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteBookmark = async (id) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bookmark:', error);
      alert('Failed to delete bookmark. Please try again.');
      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setBookmarks(data);
      }
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.push('/');
    }
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bookmark.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || bookmark.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDomainFromUrl = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      Development: '#ffa726',
      Design: '#42a5f5',
      News: '#66bb6a',
      Entertainment: '#ef5350',
      Other: '#ab47bc'
    };
    return colors[category] || '#ffa726';
  };

  const getUserInitial = () => {
    if (!user) return 'U';
    if (user.user_metadata?.name) {
      return user.user_metadata.name.charAt(0).toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>📑</span>
            <span className={styles.logoText}>Bookmarx</span>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.addButton} onClick={() => setIsAddModalOpen(true)}>
              <span className={styles.addIcon}>+</span>
              Add Bookmark
            </button>
            <div className={styles.userMenu} onClick={handleSignOut} title="Sign Out">
              <div className={styles.avatar}>{getUserInitial()}</div>
            </div>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          <aside className={styles.sidebar}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search bookmarks..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.categories}>
              <h3 className={styles.categoriesTitle}>Categories</h3>
              {categories.map(category => (
                <button
                  key={category}
                  className={`${styles.categoryButton} ${selectedCategory === category ? styles.categoryButtonActive : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <span className={styles.categoryDot} style={{
                    background: category === 'All' ? '#ffa726' : getCategoryColor(category)
                  }}></span>
                  {category}
                  <span className={styles.categoryCount}>
                    {category === 'All'
                      ? bookmarks.length
                      : bookmarks.filter(b => b.category === category).length}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.stats}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{bookmarks.length}</div>
                <div className={styles.statLabel}>Total Bookmarks</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{categories.length - 1}</div>
                <div className={styles.statLabel}>Categories</div>
              </div>
            </div>
          </aside>

          <div className={styles.bookmarksSection}>
            <div className={styles.bookmarksHeader}>
              <h1 className={styles.pageTitle}>
                {selectedCategory === 'All' ? 'All Bookmarks' : selectedCategory}
              </h1>
              <p className={styles.bookmarksCount}>
                {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
              </p>
            </div>

            {filteredBookmarks.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📭</span>
                <h3 className={styles.emptyTitle}>No bookmarks found</h3>
                <p className={styles.emptyDescription}>
                  {searchQuery ? 'Try a different search term' : 'Start by adding your first bookmark'}
                </p>
              </div>
            ) : (
              <div className={styles.bookmarksGrid}>
                {filteredBookmarks.map((bookmark, index) => (
                  <div
                    key={bookmark.id}
                    className={styles.bookmarkCard}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={styles.bookmarkHeader}>
                      <div
                        className={styles.bookmarkCategory}
                        style={{ background: getCategoryColor(bookmark.category) }}
                      >
                        {bookmark.category}
                      </div>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        title="Delete bookmark"
                      >
                        ×
                      </button>
                    </div>

                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.bookmarkLink}
                    >
                      <div className={styles.bookmarkIcon}>
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${getDomainFromUrl(bookmark.url)}&sz=64`}
                          alt=""
                          className={styles.favicon}
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                      <h3 className={styles.bookmarkTitle}>{bookmark.title}</h3>
                      <p className={styles.bookmarkUrl}>{getDomainFromUrl(bookmark.url)}</p>
                    </a>

                    <div className={styles.bookmarkFooter}>
                      <span className={styles.bookmarkDate}>
                        Added {new Date(bookmark.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setIsAddModalOpen(false)}>×</button>
            <h2 className={styles.modalTitle}>Add New Bookmark</h2>
            <form className={styles.form} onSubmit={handleAddBookmark}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Title</label>
                <input
                  type="text"
                  placeholder="My Awesome Website"
                  className={styles.input}
                  value={newBookmark.title}
                  onChange={(e) => setNewBookmark({...newBookmark, title: e.target.value})}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>URL</label>
                <input
                  type="text"
                  placeholder="https://example.com"
                  className={styles.input}
                  value={newBookmark.url}
                  onChange={(e) => setNewBookmark({...newBookmark, url: e.target.value})}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Category</label>
                <select
                  className={styles.select}
                  value={newBookmark.category}
                  onChange={(e) => setNewBookmark({...newBookmark, category: e.target.value})}
                >
                  {categories.filter(c => c !== 'All').map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className={styles.submitButton}>
                Add Bookmark
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookmarksPage;