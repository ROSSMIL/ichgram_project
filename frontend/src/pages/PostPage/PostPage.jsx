import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api/axios";
import Avatar from "../../components/Avatar/Avatar";
import styles from "./PostPage.module.css";

const PostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await API.get(`/api/posts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPost(res.data);
        setComments(res.data.comments || []);
      } catch (err) {
        console.error("Error fetching post:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const token = localStorage.getItem("token");
      const res = await API.post(
        `/api/posts/${id}/comment`,
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setComments(res.data.comments);
      setNewComment("");
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  if (loading) return <div className={styles.loader}>Loading...</div>;
  if (!post) return <div className={styles.error}>Post not found</div>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <span className={styles.headerTitle}>Post</span>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.imageBox}>
          <img src={post.url} alt="Post content" className={styles.postImg} />
        </div>

        <div className={styles.detailsBox}>
          <div className={styles.authorRow}>
            <Avatar user={post.user} size={36} />
            <span className={styles.username}>{post.user?.username}</span>
          </div>

          {post.caption && <p className={styles.caption}>{post.caption}</p>}

          <div className={styles.commentsList}>
            {comments.map((c) => (
              <div key={c._id || c.createdAt} className={styles.commentItem}>
                <strong>{c.user?.username || c.username}: </strong>
                <span>{c.text}</span>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        </div>
      </main>

      <form className={styles.inputFooter} onSubmit={handleSendComment}>
        <input
          type="text"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className={styles.commentInput}
        />
        <button type="submit" disabled={!newComment.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default PostPage;
