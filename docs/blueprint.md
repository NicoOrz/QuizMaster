# **App Name**: QuizMaster

## Core Features:

- Import JSON: Import questions from JSON files.
- Quiz Modes: Provide 'practice' and 'exam' modes. Exam mode should randomly select questions from the imported JSON.
- Exam History: Record exam scores and display incorrect questions with explanations after the exam. Store the record to Firestore

## Style Guidelines:

- Primary color: Neutral light gray or white for clean background.
- Secondary color: Darker gray for text and important elements to provide contrast.
- Accent: Blue (#3498db) to indicate interactivity and highlight important actions.
- Clear, sans-serif font for questions and answers.
- Clean and well-spaced layout to avoid clutter.
- Simple icons for navigation and feedback (e.g., checkmark for correct, X for incorrect).

## Original User Request:
一个答题系统，可以通过json导入题库，提供刷题和考试模式，考试模式从题库中随机抽取一定量题目进行考试，考试结束后显示错误的题目和解析（从json和获取），记录每一次的考试分数和答题过程，json大概长这样[
  {
    "question_number": 101,
    "question_text": "Choose two. The data in this instance is transient; no backup or replication will be required. It is currently under performing... The database size is static and including indexes is 19G. Total system memory is 32G. After profiling the system, you highlight these MySQL status and global variables: Com_rollback 85408355 Com_commit 1242324 Innodb_buffer_pool_pages_free 163840 mysqld buffer_pool_size=20G innodb_flush_log_at_trx_commit=2 disable-log-bin The OS metrics indicate that disk is a bottleneck. Other variables retain their default values. Which two changes will provide the most benefit to the instance?",
    "options": {
      "A": "sync_binlog=0",
      "B": "buffer_pool_size=24G",
      "C": "innodb_flush_log_at_trx_commit=1",
      "D": "innodb_doublewrite=0",
      "E": "max_connections=10000",
      "F": "innodb_log_file_size=1G"
    },
    "correct_answer": ["D", "F"],
    "explanation": "A) [错误]\nB) [错误]\nC) [错误]\nE) [错误]"
  },
  {
    "question_number": 102,
    "question_text": "Choose two. Examine Joe's account: CREATE USER 'joe'@'%' IDENTIFIED BY 'secret' GRANT ALL PRIVILEGES ON *.* TO 'joe'@'%'. All existing connections for joe are killed. Which two commands will stop joe establishing access to the MySQL instance?",
    "options": {
      "A": "ALTER USER 'joe'@'%' ACCOUNT LOCK",
      "B": "ALTER USER 'joe'@'%' PASSWORD HISTORY:",
      "C": "REVOKE ALL PRIVILEGES ON *.* FROM 'joe'@'%'",
      "D": "ALTER USER 'joe'@'%' SET password='invalid'",
      "E": "ALTER USER 'joe'@'%' IDENTIFIED BY 'invalid' PASSWORD EXPIRE",
      "F": "REVOKE USAGE ON *.* FROM 'joe'@'%'"
    },
    "correct_answer": ["A", "E"],
    "explanation": "F:REVOKE 无法取回 USAGE 权限 E: If the password is expired (whether manually or automatically), the server either disconnects the client or restricts the operations permitted to it"
  },
  {
    "question_number": 103,
    "question_text": "Which two can minimize security risks when creating user accounts?",
    "options": {
      "A": "Avoid the use of wildcards in host names.",
      "B": "Avoid the use of wildcards in usernames.",
      "C": "Require the use of mixed case usernames.",
      "D": "Do not allow accounts without passwords.",
      "E": "Require users to have the FIREWALL USER privilege defined."
    },
    "correct_answer": ["A", "D"],
    "explanation": "B) [错误]\nC) [错误]\nE) [错误]"
  },
  {
    "question_number": 104,
    "question_text": "Choose two. Mary connects to a Linux MySQL Server from a client on a Windows machine. Examine this statement and output:（见下图）Which two are true?",
    "image_url": "https://oss-emcsprod-public.modb.pro/image/exam/question_1640750496324.jpg",
    "options": {
      "A": "Mary connected from a client machine whose IP address is 192.0.2.101.",
      "B": "Mary connected to the database server whose IP address is 192.0.2.101.",
      "C": "Mary has the privileges of account mary@%.",
      "D": "Mary connected using a UNIX socket.",
      "E": "Mary authenticated to the account mary@192.0.2.101."
    },
    "correct_answer": ["A", "C"],
    "explanation": "B) [错误]\nD) [错误]\nE) [错误]"
  },
  