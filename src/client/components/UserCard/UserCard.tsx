import "../../styles/UserCard.css"

function UserCard({ user }: { user: any }) {
  return (
    <li className="user-card">
      <img src={user.profilePicture} alt={user.displayName} className="user-avatar" />
      <div>
        <span className="user-name">{user.displayName}</span>
        <div className="user-bio">{user.bio}</div>
      </div>
    </li>
  );
}

export default UserCard;