import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import Post from "../models/postModel.js";

const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log("🌱 Database already seeded. Skipping...");
      return;
    }

    console.log("🚧 Database is empty. Starting auto-seeding process...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    const usersData = [
      {
        username: "itcareerhub",
        email: "hub@itcareer.com",
        password: hashedPassword,
        fullName: "IT Career Hub",
        avatar:
          "https://api.dicebear.com/7.x/initials/svg?seed=ITCareerHub&backgroundColor=0073b1",
        bio: "Your guide to the world of IT technologies and successful employment! 🚀",
        website: "itcareerhub.de",
      },
      {
        username: "coach.tonia",
        email: "tonia@example.com",
        password: hashedPassword,
        fullName: "Tonia Coach",
        avatar:
          "https://api.dicebear.com/7.x/initials/svg?seed=Tonia&backgroundColor=ff4081",
        bio: "Fitness coach & Healthy lifestyle motivator. Create the body of your dreams! 💪",
        website: "toniafit.com",
      },
      {
        username: "fsssociety",
        email: "society@example.com",
        password: hashedPassword,
        fullName: "FS Society",
        avatar:
          "https://api.dicebear.com/7.x/initials/svg?seed=Society&backgroundColor=4caf50",
        bio: "Our world is digital. Cyber-security, tech discussions and web development. 💻⌨️",
        website: "fs-society.org",
      },
      {
        username: "pixel_architect",
        email: "pixel@example.com",
        password: hashedPassword,
        fullName: "Alex Design",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=pixel",
        bio: "UI/UX Designer. Pixel perfect is my religion. Looking for freelance projects. 🎨",
      },
      {
        username: "gamer_pro",
        email: "gamer@example.com",
        password: hashedPassword,
        fullName: "Max Payne",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=gamer",
        bio: "Competitive online PC gamer. The Finals & CS2 veteran. High FPS enthusiast. 🎮",
      },
      {
        username: "nature_wild",
        email: "nature@example.com",
        password: hashedPassword,
        fullName: "Jane Wild",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=nature",
        bio: "Landscape photographer. Traveling the world and catching perfect moments 🌍",
      },
      {
        username: "foodie_travel",
        email: "food@example.com",
        password: hashedPassword,
        fullName: "Elena Gastronome",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=food",
        bio: "Exploring cultures through their kitchens. Posting the best recipes here. 🍕🍣🍜",
      },
      {
        username: "sound_wave",
        email: "sound@example.com",
        password: hashedPassword,
        fullName: "Rhythm Master",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=sound",
        bio: "Sound producer, synthesizer collector and music lover. Ambient & Techno tracks. 🎵",
      },
      {
        username: "cyber_ninja",
        email: "ninja@example.com",
        password: hashedPassword,
        fullName: "Lee Shin",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=ninja",
        bio: "Full stack JavaScript wizard. Node, React & MongoDB is life. Let's build something cool.",
      },
      {
        username: "volley_king",
        email: "volley@example.com",
        password: hashedPassword,
        fullName: "Dan Volleyball",
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=volley",
        bio: "Active volleyball player. Team captain. Training every single day. 🏐💪",
      },
    ];

    const createdUsers = await User.insertMany(usersData);
    console.log(`\n👥 Created ${createdUsers.length} test users.`);

    console.log("🔗 Generating real following/follower connections...");

    for (let i = 0; i < createdUsers.length; i++) {
      const currentUser = createdUsers[i];

      const otherUsers = createdUsers.filter(
        (u) => String(u._id) !== String(currentUser._id),
      );

      const followCount = Math.floor(Math.random() * 5) + 3;

      const targetsToFollow = otherUsers
        .sort(() => 0.5 - Math.random())
        .slice(0, followCount);

      for (const target of targetsToFollow) {
        if (!currentUser.following.includes(target._id)) {
          currentUser.following.push(target._id);
        }
        if (!target.followers.includes(currentUser._id)) {
          target.followers.push(currentUser._id);
        }
      }
    }

    for (const user of createdUsers) {
      user.followersCount = user.followers.length;
      user.followingCount = user.following.length;
      await user.save();
    }
    console.log(
      "✅ Followers and following connections established successfully.",
    );

    const hub = createdUsers.find((u) => u.username === "itcareerhub");
    const tonia = createdUsers.find((u) => u.username === "coach.tonia");
    const society = createdUsers.find((u) => u.username === "fsssociety");
    const pixel = createdUsers.find((u) => u.username === "pixel_architect");
    const gamer = createdUsers.find((u) => u.username === "gamer_pro");
    const nature = createdUsers.find((u) => u.username === "nature_wild");
    const foodie = createdUsers.find((u) => u.username === "foodie_travel");
    const sound = createdUsers.find((u) => u.username === "sound_wave");
    const ninja = createdUsers.find((u) => u.username === "cyber_ninja");
    const volley = createdUsers.find((u) => u.username === "volley_king");

    const now = Date.now();

    const postsData = [
      {
        user: hub._id,
        url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "Starting the week with a clean slate and ambitious plans. May everything you've planned come true! 🎯✨",
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        comments: [
          {
            user: society._id,
            username: society.username,
            text: "Great attitude, fully support this!",
            createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
          },
          {
            user: pixel._id,
            username: pixel.username,
            text: "Inspiring shot! Have a great week everyone 🙌",
            createdAt: new Date(now - 12 * 60 * 60 * 1000),
          },
        ],
      },
      {
        user: tonia._id,
        url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "Beauty is in the details we often overlook in a rush. Stop for a minute and just look around. 🌿🍂",
        createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
        comments: [
          {
            user: nature._id,
            username: nature.username,
            text: "Oh yes, being able to slow down is a superpower nowadays 😌",
            createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      {
        user: society._id,
        url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "The perfect balance between work, creativity, and rest. What helps you recharge? ☕🔋",
        createdAt: new Date(now - 21 * 24 * 60 * 60 * 1000),
        comments: [
          {
            user: sound._id,
            username: sound.username,
            text: "Good music in my headphones and a cup of hot tea is my best recipe.",
            createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000),
          },
          {
            user: foodie._id,
            username: foodie.username,
            text: "A delicious break always saves the day in the middle of a busy schedule! 🥑",
            createdAt: new Date(now - 19 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      {
        user: pixel._id,
        url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "Minimalism in everything is one of the main trends of our reality. Less noise, more essence. 📐🤍",
        createdAt: new Date(now - 15 * 60 * 1000),
        comments: [
          {
            user: gamer._id,
            username: gamer.username,
            text: "Looks incredibly stylish and very atmospheric!",
            createdAt: new Date(now - 10 * 60 * 1000),
          },
          {
            user: ninja._id,
            username: ninja.username,
            text: "Purity of form and nothing extra. Absolute class!",
            createdAt: new Date(now - 5 * 60 * 1000),
          },
        ],
      },
      {
        user: gamer._id,
        url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "Cozy evening vibes. The best time to dive into your favorite hobby and mute phone notifications. 🌌🎮",
        createdAt: new Date(now - 18 * 60 * 60 * 1000),
        comments: [
          {
            user: sound._id,
            username: sound.username,
            text: "This is exactly what is needed after a long day!",
            createdAt: new Date(now - 16 * 60 * 60 * 1000),
          },
        ],
      },
      {
        user: nature._id,
        url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "Nature is the best artist. No filters can capture these natural textures and light. 🪵☀️",
        createdAt: new Date(now - 12 * 60 * 60 * 1000),
        comments: [
          {
            user: pixel._id,
            username: pixel.username,
            text: "The color palette is stunning, definitely saving this for inspiration!",
            createdAt: new Date(now - 10 * 60 * 60 * 1000),
          },
        ],
      },
      {
        user: foodie._id,
        url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "The little joys of everyday life make up the big happy picture. Have a great mood, everyone! 🌸🍰",
        createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
        comments: [
          {
            user: tonia._id,
            username: tonia.username,
            text: "Such a pleasant photo and very true words!",
            createdAt: new Date(now - 20 * 60 * 60 * 1000),
          },
        ],
      },
      {
        user: sound._id,
        url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "Inspiration can be found in absolutely everything, as long as you look at it from the right angle. 🔎💡",
        createdAt: new Date(now - 5 * 60 * 60 * 1000),
        comments: [
          {
            user: society._id,
            username: society.username,
            text: "This shot really makes you think. Very cool!",
            createdAt: new Date(now - 4 * 60 * 60 * 1000),
          },
        ],
      },
      {
        user: ninja._id,
        url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "Work process is in full swing. Productivity is at its peak today, moving only forward! 📈💪",
        createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
        comments: [
          {
            user: hub._id,
            username: hub.username,
            text: "Awesome! That kind of focus always brings excellent results.",
            createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      {
        user: volley._id,
        url: "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "A fresh perspective on familiar things helps find unexpected solutions to complex tasks. Have a productive day! 🧠🚀",
        createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000),
        comments: [
          {
            user: ninja._id,
            username: ninja.username,
            text: "100% true! Sometimes you just need to switch your focus.",
            createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      {
        user: volley._id,
        url: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=600&h=600&q=80",
        caption:
          "Great game today! Teamwork and dedication always pay off on the field. 🏐🏆",
        createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
        comments: [
          {
            user: tonia._id,
            username: tonia.username,
            text: "Congrats! Working as a team is always the key to success 🥇",
            createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    ];

    await Post.deleteMany({});
    const createdPosts = await Post.insertMany(postsData);
    console.log(`📸 Created ${createdPosts.length} test posts.`);

    console.log("📝 Calculating and updating postsCount for each user...");
    for (const user of createdUsers) {
      const postsCountForUser = await Post.countDocuments({ user: user._id });
      user.postsCount = postsCountForUser;
      await user.save();
    }

    console.log("\n🎉 Database auto-seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding database failed:", error);
  }
};

export default seedDatabase;
