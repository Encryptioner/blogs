## Slide 1: Title Slide

# Hands-On Coding: Building Basic Application Tools
## From Theory to Practice - Understanding the Fundamentals

**Presented by:** Ankur Mursalin  
**Lead Software Engineer, Nerddevs**

*"The best way to understand a tool is to build it yourself."*

---

## Slide 2: The Journey Begins

# 🎯 My Coding Challenge Adventure

**Two challenges that changed everything:**

1. **[Challenge: Which](https://codingchallenges.fyi/challenges/challenge-which)**
   - Simple: `echo $PATH` and extract executable paths
   - My first coding challenge ever!

2. **[Challenge: Shell](https://codingchallenges.fyi/challenges/challenge-shell)**
   - Complex: Build a functional Unix shell
   - Low-level system programming

*"I wanted to do both together - and it was the best decision I made."*

---

## Slide 3: Why Build Basic Tools?

# 🤔 Why Build What Already Exists?

**The Learning Paradox:**
- We use tools daily without understanding them
- `ls`, `cd`, `which` - simple commands, complex internals
- **Understanding = Better Usage**

**Real Benefits:**
- Debug system issues effectively
- Write better automation scripts
- Appreciate the elegance of Unix philosophy
- **AI can help, but fundamentals matter**

*"AI generated most of my code, but I learned the fundamentals."*

---

## Slide 4: The "Which" Challenge - Simple but Powerful

# 🔍 Challenge 1: Building "Which"

**The Problem:**
```bash
$ which python
/usr/bin/python
```

**The Challenge:** Recreate this functionality

**My Approach:**
```c
// Parse PATH environment variable
// Check each directory for executable
// Return first match found
```

**Key Learning:** Environment variables, file permissions, PATH parsing

---

## Slide 5: The Shell Challenge - Going Deep

# 🐚 Challenge 2: Building a Shell

**The Problem:** Understand what happens when you type `ls -la`

**The Solution:** Build **ccsh** (Compact C Shell)

**Core Features:**
- Command execution with `fork()` and `exec()`
- I/O redirection (`>`, `<`, `>>`)
- Background job management
- Built-in commands (`cd`, `pwd`, `exit`)
- Signal handling (`Ctrl+C`)

---

## Slide 6: The "Aha!" Moments

# 💡 What I Discovered

**Process Management:**
- `fork()` creates exact process copies
- `exec()` replaces process memory
- File descriptors are just numbers

**System Calls in Action:**
```c
pid_t pid = fork();
if (pid == 0) {
    execvp(command, args);  // Child becomes new program
} else {
    waitpid(pid, &status, 0);  // Parent waits
}
```

**The Magic:** Understanding how `Ctrl+C` actually works!

---

## Slide 7: AI as a Learning Partner

# 🤖 AI + Fundamentals = Powerful Learning

**How AI Helped Me:**
- Generated boilerplate code structure
- Explained complex system calls
- Debugged memory management issues
- Suggested best practices

**What I Learned:**
- AI is a tool, not a replacement
- Understanding fundamentals is crucial
- AI can accelerate learning when you know the basics

*"AI generated the code, but I understood every line."*

---

## Slide 8: Real-World Applications

# 🌍 Beyond the Challenges

**What This Knowledge Enables:**

**System Administration:**
- Debug process issues effectively
- Understand file descriptor limits
- Write better automation scripts

**Development:**
- Optimize build processes
- Create custom development tools
- Understand container internals

**Career Growth:**
- Deeper system understanding
- Better problem-solving skills
- Confidence with low-level programming

---

## Slide 9: The Learning Path

# 📚 Your Journey Starts Here

**Phase 1: Simple Tools**
- Build `which` command
- Understand PATH and environment variables
- Learn file system operations

**Phase 2: System Tools**
- Build basic shell
- Master process management
- Implement I/O redirection

**Phase 3: Advanced Concepts**
- Signal handling
- Job control
- Pipeline implementation

---

## Slide 10: Getting Started

# 🚀 Start Your Own Adventure

**Begin with Simple Challenges:**
1. [Coding Challenges FYI](https://codingchallenges.fyi) - Start with "which"
2. Build incrementally - don't jump to complex tools
3. Use AI as a learning partner, not a crutch

**Resources:**
- [My Shell Implementation Guide](https://encryptioner.github.io)
- [Coding Challenges Community](https://codingchallenges.fyi)
- [Unix Programming Manual](https://man7.org/linux/man-pages/)

---

## Slide 11: The Benefits for Others

# 🎯 Why This Matters for Everyone

**For Junior Developers:**
- Build confidence with system concepts
- Understand tools you use daily
- Develop debugging skills

**For Senior Developers:**
- Deepen system knowledge
- Mentor others effectively
- Solve complex system issues

**For Teams:**
- Better system understanding
- Improved troubleshooting
- More robust automation

---

## Slide 12: Key Takeaways

# 🎯 Key Takeaways

**1. Start Simple**
- Begin with basic tools like `which`
- Build incrementally
- Don't be afraid to use AI as a learning partner

**2. Understand Fundamentals**
- System calls matter
- Process management is key
- File descriptors are powerful

**3. Practice Makes Perfect**
- Code every day
- Break things to understand them
- Share your learnings

---

## Slide 13: The Bottom Line

# 🎉 The Bottom Line

**Building basic tools teaches you:**
- How systems actually work
- Why certain design decisions were made
- How to debug complex issues
- The elegance of Unix philosophy

**"The best way to master a tool is to understand how it works from the inside out."**

---

## Slide 14: Resources & Next Steps

# 📚 Resources & Next Steps

**Start Your Journey:**
- [Coding Challenges FYI](https://codingchallenges.fyi)
- [My Shell Implementation](https://github.com/Encryptioner/ccsh)
- [Unix Programming Manual](https://man7.org/linux/man-pages/)

**Connect & Learn:**
- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [linkedin.com/in/mir-mursalin-ankur](https://linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [github.com/Encryptioner](https://github.com/Encryptioner)

**Next Challenge:** Build your own version of `ls` or `cat`!

---

## Slide 15: Thank You

# Thank You!

**Questions & Discussion**

**Remember:** Every expert was once a beginner who decided to build something simple.

*"The journey of a thousand miles begins with a single `echo $PATH`."*

**Happy Coding! 🐚💻**
