/* ============================================
   📚 NOTEBOOK EXAMPLES
   เรียงจากง่ายไปยาก: พื้นฐาน → numpy → pandas → ML → AI
   ============================================ */

const NB_EXAMPLES = [
  // ============ WELCOME ============
  {
    key: 'welcome',
    level: 'เริ่มต้น',
    icon: '👋',
    name: 'Hello AI',
    desc: 'ทักทาย Python และดูว่าระบบทำงานได้',
    cells: [
      {
        type: 'md',
        code: '# 👋 ยินดีต้อนรับสู่ AI Notebook\nนี่คือ **Python** ที่รันอยู่ใน Browser ของคุณ!\n\nลองกดปุ่ม ▶️ รัน ที่ Cell ข้างล่าง หรือกด `Shift+Enter`'
      },
      {
        type: 'code',
        code: '# ลองรัน Cell นี้ดูสิ\nprint("สวัสดี AI! 🤖")\nprint("Python กำลังทำงานอยู่บนเครื่องคุณเอง")'
      },
      {
        type: 'code',
        code: '# คำนวณง่าย ๆ\na = 10\nb = 20\nprint(f"{a} + {b} = {a + b}")\n\n# Python ใหม่ ๆ ก็ใช้ได้\nname = "AI Lab"\nprint(f"ยินดีต้อนรับสู่ {name}")'
      },
      {
        type: 'md',
        code: '## ลำดับถัดไป\nเลือกตัวอย่างจากแถบด้านซ้าย:\n- **NumPy** — คำนวณ array เร็ว ๆ\n- **Pandas** — จัดการตาราง\n- **Matplotlib** — วาดกราฟ\n- **Iris Classification** — ML ตัวแรกของคุณ!'
      }
    ]
  },

  // ============ NUMPY ============
  {
    key: 'numpy',
    level: 'พื้นฐาน',
    icon: '🔢',
    name: 'NumPy Basics',
    desc: 'array, vector, matrix สำหรับ AI',
    cells: [
      {
        type: 'md',
        code: '# 🔢 NumPy - หัวใจของ AI\nNumPy คือ library ที่ใช้คำนวณ **array** และ **matrix** ได้เร็วมาก ทุก library AI ใช้ NumPy เป็นพื้นฐาน'
      },
      {
        type: 'code',
        code: 'import numpy as np\n\n# สร้าง array\na = np.array([1, 2, 3, 4, 5])\nprint("Array:", a)\nprint("ขนาด:", a.shape)\nprint("ประเภท:", a.dtype)'
      },
      {
        type: 'code',
        code: '# สร้าง matrix 3x3\nmatrix = np.array([\n    [1, 2, 3],\n    [4, 5, 6],\n    [7, 8, 9]\n])\nprint("Matrix:\\n", matrix)\nprint("\\nผลรวมแต่ละแถว:", matrix.sum(axis=1))\nprint("ผลรวมแต่ละคอลัมน์:", matrix.sum(axis=0))'
      },
      {
        type: 'code',
        code: '# คำนวณ vector แบบ AI\nimport numpy as np\n\n# Weights ของ neural network จำลอง\nweights = np.array([0.5, -0.3, 0.8])\ninput_data = np.array([1.0, 2.0, 3.0])\n\n# Dot product (หัวใจของ NN!)\noutput = np.dot(weights, input_data)\nprint(f"Output: {output}")'
      },
      {
        type: 'code',
        code: '# สุ่มเลข + สถิติ\nimport numpy as np\nnp.random.seed(42)\n\ndata = np.random.randn(1000)\nprint(f"ค่าเฉลี่ย: {data.mean():.3f}")\nprint(f"ค่าเบี่ยงเบนมาตรฐาน: {data.std():.3f}")\nprint(f"ค่าสูงสุด: {data.max():.3f}")\nprint(f"ค่าต่ำสุด: {data.min():.3f}")'
      }
    ]
  },

  // ============ PANDAS ============
  {
    key: 'pandas',
    level: 'พื้นฐาน',
    icon: '🐼',
    name: 'Pandas DataFrame',
    desc: 'จัดการข้อมูลแบบตาราง',
    cells: [
      {
        type: 'md',
        code: '# 🐼 Pandas - จัดการตารางข้อมูล\nPandas ใช้สำหรับโหลด, ทำความสะอาด, และวิเคราะห์ข้อมูลแบบตาราง (เหมือน Excel)'
      },
      {
        type: 'code',
        code: 'import pandas as pd\n\n# สร้าง DataFrame\ndf = pd.DataFrame({\n    "ชื่อ": ["น้องเอ", "น้องบี", "น้องซี", "น้องดี"],\n    "อายุ": [13, 14, 13, 15],\n    "วิชาคอม": [85, 92, 78, 88],\n    "ห้อง": ["ม.3/1", "ม.3/2", "ม.3/1", "ม.3/2"]\n})\nprint(df)'
      },
      {
        type: 'code',
        code: '# สถิติเบื้องต้น\nprint("คะแนนเฉลี่ย:", df["วิชาคอม"].mean())\nprint("คะแนนสูงสุด:", df["วิชาคอม"].max())\nprint("\\nนักเรียนคะแนน > 80:")\nprint(df[df["วิชาคอม"] > 80])'
      },
      {
        type: 'code',
        code: '# Group By - สรุปข้อมูลตามห้อง\ngrouped = df.groupby("ห้อง").agg({\n    "วิชาคอม": ["mean", "max", "min"],\n    "อายุ": "mean"\n})\nprint(grouped)'
      }
    ]
  },

  // ============ MATPLOTLIB ============
  {
    key: 'matplotlib',
    level: 'พื้นฐาน',
    icon: '📊',
    name: 'Matplotlib วาดกราฟ',
    desc: 'แสดงข้อมูลเป็นรูปภาพ',
    cells: [
      {
        type: 'md',
        code: '# 📊 Matplotlib - วาดกราฟ\nเครื่องมือพื้นฐานที่สุดสำหรับวาดกราฟใน Python'
      },
      {
        type: 'code',
        code: 'import matplotlib.pyplot as plt\nimport numpy as np\n\n# กราฟเส้น sine wave\nx = np.linspace(0, 4*np.pi, 100)\ny = np.sin(x)\n\nplt.figure(figsize=(8, 4))\nplt.plot(x, y, color="#7C3AED", linewidth=2)\nplt.title("Sine Wave")\nplt.xlabel("x")\nplt.ylabel("sin(x)")\nplt.grid(True, alpha=0.3)\nplt.show()'
      },
      {
        type: 'code',
        code: 'import matplotlib.pyplot as plt\nimport numpy as np\n\n# Scatter plot - ดูการกระจายของข้อมูล\nnp.random.seed(0)\nn = 200\nx = np.random.randn(n)\ny = x * 0.5 + np.random.randn(n) * 0.5\ncolors = np.random.rand(n)\n\nplt.figure(figsize=(8, 5))\nplt.scatter(x, y, c=colors, cmap="viridis", alpha=0.6, s=60)\nplt.colorbar()\nplt.title("Scatter Plot ตัวอย่าง")\nplt.xlabel("Feature 1")\nplt.ylabel("Feature 2")\nplt.show()'
      },
      {
        type: 'code',
        code: 'import matplotlib.pyplot as plt\n\n# Bar chart - กราฟแท่ง\nsubjects = ["คอม", "คณิต", "อังกฤษ", "ไทย", "วิทย์"]\nscores = [92, 78, 85, 88, 90]\ncolors = ["#7C3AED", "#06B6D4", "#EC4899", "#FBBF24", "#10B981"]\n\nplt.figure(figsize=(8, 5))\nbars = plt.bar(subjects, scores, color=colors)\nplt.title("คะแนนสอบ")\nplt.ylim(0, 100)\nfor bar, score in zip(bars, scores):\n    plt.text(bar.get_x() + bar.get_width()/2, score + 1, str(score), ha="center", fontweight="bold")\nplt.show()'
      }
    ]
  },

  // ============ ML 1: KNN ============
  {
    key: 'iris',
    level: 'ML',
    icon: '🌸',
    name: 'จำแนกดอกไม้ (Iris)',
    desc: 'AI ตัวแรกของคุณ! ใช้ KNN',
    cells: [
      {
        type: 'md',
        code: '# 🌸 จำแนกดอกไม้ Iris\nเราจะสร้าง AI ที่บอกได้ว่าดอกไม้เป็นพันธุ์ไหน จาก:\n- ความยาวกลีบ\n- ความกว้างกลีบ\n\n**ต้องโหลด scikit-learn ก่อน** (คลิกปุ่มในแถบด้านซ้าย)'
      },
      {
        type: 'code',
        code: '# โหลด scikit-learn\nimport micropip\nawait micropip.install("scikit-learn")\nprint("✅ พร้อม!")'
      },
      {
        type: 'code',
        code: 'from sklearn.datasets import load_iris\nimport pandas as pd\n\n# โหลดชุดข้อมูล Iris\niris = load_iris()\nX = iris.data  # features\ny = iris.target  # labels (0, 1, 2)\n\nprint(f"จำนวนตัวอย่าง: {len(X)}")\nprint(f"จำนวน feature: {X.shape[1]}")\nprint(f"พันธุ์ดอกไม้: {iris.target_names}")\nprint(f"feature: {iris.feature_names}")\n\n# แสดง 5 แถวแรก\ndf = pd.DataFrame(X, columns=iris.feature_names)\ndf["species"] = [iris.target_names[i] for i in y]\nprint(df.head())'
      },
      {
        type: 'code',
        code: 'import matplotlib.pyplot as plt\nimport numpy as np\n\n# Plot ดูการกระจาย\ncolors = ["#EF4444", "#10B981", "#3B82F6"]\nplt.figure(figsize=(8, 5))\nfor i, name in enumerate(iris.target_names):\n    mask = y == i\n    plt.scatter(X[mask, 2], X[mask, 3], label=name, color=colors[i], alpha=0.7, s=60)\nplt.xlabel(iris.feature_names[2])\nplt.ylabel(iris.feature_names[3])\nplt.title("Iris Dataset")\nplt.legend()\nplt.grid(True, alpha=0.3)\nplt.show()'
      },
      {
        type: 'code',
        code: 'from sklearn.model_selection import train_test_split\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.metrics import accuracy_score\n\n# แบ่งข้อมูล train/test\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)\n\n# สร้างโมเดล KNN (K=3)\nmodel = KNeighborsClassifier(n_neighbors=3)\nmodel.fit(X_train, y_train)\n\n# ทำนายผล\ny_pred = model.predict(X_test)\nacc = accuracy_score(y_test, y_pred)\n\nprint(f"🎯 ความแม่นยำ: {acc*100:.2f}%")'
      },
      {
        type: 'code',
        code: '# ลองทำนายดอกไม้ใหม่!\n# [sepal_len, sepal_wid, petal_len, petal_wid]\nnew_flower = [[5.1, 3.5, 1.4, 0.2]]\nprediction = model.predict(new_flower)\nspecies = iris.target_names[prediction[0]]\nprint(f"🌸 ดอกไม้นี้คือ: {species}")\n\n# ลองเปลี่ยนตัวเลข แล้วรันใหม่ ดูว่าได้พันธุ์อะไร!'
      }
    ]
  },

  // ============ ML 2: Linear Regression ============
  {
    key: 'regression',
    level: 'ML',
    icon: '📈',
    name: 'ทำนายราคาบ้าน',
    desc: 'Linear Regression',
    cells: [
      {
        type: 'md',
        code: '# 📈 ทำนายราคาบ้าน\nLinear Regression — โมเดลที่ง่ายที่สุดสำหรับ **ทำนายตัวเลข**\n\n**เป้าหมาย:** จาก "ขนาดบ้าน (ตร.ม.)" → ทำนาย "ราคา (ล้านบาท)"'
      },
      {
        type: 'code',
        code: 'import micropip\nawait micropip.install("scikit-learn")\nprint("✅ พร้อม!")'
      },
      {
        type: 'code',
        code: 'import numpy as np\nimport matplotlib.pyplot as plt\n\n# สร้างข้อมูลจำลอง\nnp.random.seed(42)\nsize = np.random.uniform(40, 200, 50)  # ขนาดบ้าน\nprice = size * 0.05 + np.random.randn(50) * 1.5 + 2  # ราคา\n\nplt.figure(figsize=(8, 5))\nplt.scatter(size, price, color="#7C3AED", alpha=0.6, s=60)\nplt.xlabel("ขนาดบ้าน (ตร.ม.)")\nplt.ylabel("ราคา (ล้านบาท)")\nplt.title("ข้อมูลบ้าน")\nplt.grid(True, alpha=0.3)\nplt.show()'
      },
      {
        type: 'code',
        code: 'from sklearn.linear_model import LinearRegression\n\nX = size.reshape(-1, 1)  # ต้องเป็น 2D\ny = price\n\nmodel = LinearRegression()\nmodel.fit(X, y)\n\nprint(f"📐 สมการ: ราคา = {model.coef_[0]:.3f} × ขนาด + {model.intercept_:.3f}")\nprint(f"📊 R² Score: {model.score(X, y):.3f}")'
      },
      {
        type: 'code',
        code: 'import numpy as np\nimport matplotlib.pyplot as plt\n\n# วาดเส้นโมเดล\nx_line = np.linspace(size.min(), size.max(), 100).reshape(-1, 1)\ny_line = model.predict(x_line)\n\nplt.figure(figsize=(8, 5))\nplt.scatter(size, price, color="#7C3AED", alpha=0.6, s=60, label="ข้อมูลจริง")\nplt.plot(x_line, y_line, color="#EC4899", linewidth=3, label="เส้นที่โมเดลเรียนรู้")\nplt.xlabel("ขนาดบ้าน (ตร.ม.)")\nplt.ylabel("ราคา (ล้านบาท)")\nplt.title("Linear Regression")\nplt.legend()\nplt.grid(True, alpha=0.3)\nplt.show()'
      },
      {
        type: 'code',
        code: '# ทำนายราคา!\nmy_size = 120  # บ้าน 120 ตร.ม.\npredicted = model.predict([[my_size]])\nprint(f"🏠 บ้านขนาด {my_size} ตร.ม. → ทำนาย {predicted[0]:.2f} ล้านบาท")'
      }
    ]
  },

  // ============ ML 3: K-Means ============
  {
    key: 'kmeans',
    level: 'ML',
    icon: '🎯',
    name: 'จัดกลุ่มลูกค้า',
    desc: 'K-Means Clustering',
    cells: [
      {
        type: 'md',
        code: '# 🎯 K-Means - จัดกลุ่ม\nวิธี **Unsupervised Learning** ที่จัดกลุ่มข้อมูลให้อัตโนมัติโดยไม่ต้องบอก label'
      },
      {
        type: 'code',
        code: 'import micropip\nawait micropip.install("scikit-learn")\nprint("✅ พร้อม!")'
      },
      {
        type: 'code',
        code: 'import numpy as np\nimport matplotlib.pyplot as plt\nfrom sklearn.datasets import make_blobs\n\n# สร้างข้อมูลจำลอง 3 กลุ่ม\nX, _ = make_blobs(n_samples=300, centers=3, n_features=2, random_state=42, cluster_std=1.0)\n\nplt.figure(figsize=(8, 5))\nplt.scatter(X[:, 0], X[:, 1], color="#94A3B8", alpha=0.6, s=50)\nplt.title("ข้อมูลก่อนจัดกลุ่ม")\nplt.grid(True, alpha=0.3)\nplt.show()'
      },
      {
        type: 'code',
        code: 'from sklearn.cluster import KMeans\nimport matplotlib.pyplot as plt\n\n# จัดกลุ่มเป็น 3 กลุ่ม\nkmeans = KMeans(n_clusters=3, random_state=42, n_init=10)\nlabels = kmeans.fit_predict(X)\ncenters = kmeans.cluster_centers_\n\ncolors = ["#7C3AED", "#06B6D4", "#EC4899"]\nplt.figure(figsize=(8, 5))\nfor i in range(3):\n    mask = labels == i\n    plt.scatter(X[mask, 0], X[mask, 1], color=colors[i], alpha=0.6, s=50, label=f"กลุ่ม {i+1}")\nplt.scatter(centers[:, 0], centers[:, 1], color="black", marker="X", s=200, label="จุดกลาง")\nplt.title("หลังจัดกลุ่มด้วย K-Means")\nplt.legend()\nplt.grid(True, alpha=0.3)\nplt.show()'
      }
    ]
  },

  // ============ DL: Simple Neural Network ============
  {
    key: 'neural',
    level: 'Deep',
    icon: '🧠',
    name: 'Neural Network จากศูนย์',
    desc: 'เขียน NN ด้วย NumPy ตั้งแต่ต้น',
    cells: [
      {
        type: 'md',
        code: '# 🧠 Neural Network จากศูนย์\nเราจะสร้าง Neural Network แบบง่าย ๆ ด้วย NumPy เพื่อเข้าใจว่ามันทำงานยังไง\n\n**เป้าหมาย:** เรียนรู้ฟังก์ชัน XOR (ปัญหาคลาสสิคที่ NN แก้ได้)'
      },
      {
        type: 'code',
        code: 'import numpy as np\n\n# XOR Truth Table\nX = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])\ny = np.array([[0], [1], [1], [0]])\n\nprint("Input → Output (XOR)")\nfor i in range(4):\n    print(f"{X[i]} → {y[i][0]}")'
      },
      {
        type: 'code',
        code: 'import numpy as np\n\n# Activation function\ndef sigmoid(x):\n    return 1 / (1 + np.exp(-x))\n\ndef sigmoid_d(x):\n    return x * (1 - x)\n\nnp.random.seed(42)\n\n# Weights (2 → 4 → 1)\nW1 = np.random.randn(2, 4)\nW2 = np.random.randn(4, 1)\n\nprint("Initial Weights shape:")\nprint(f"  W1: {W1.shape}")\nprint(f"  W2: {W2.shape}")'
      },
      {
        type: 'code',
        code: 'import matplotlib.pyplot as plt\n\n# Training\nlr = 0.5\nepochs = 5000\nlosses = []\n\nfor i in range(epochs):\n    # Forward\n    h = sigmoid(X @ W1)\n    output = sigmoid(h @ W2)\n\n    # Loss\n    loss = np.mean((y - output) ** 2)\n    losses.append(loss)\n\n    # Backward\n    d_output = (y - output) * sigmoid_d(output)\n    d_h = d_output @ W2.T * sigmoid_d(h)\n\n    W2 += h.T @ d_output * lr\n    W1 += X.T @ d_h * lr\n\nprint(f"📉 Final loss: {loss:.6f}")\n\n# Plot loss curve\nplt.figure(figsize=(8, 4))\nplt.plot(losses, color="#7C3AED")\nplt.title("Loss ลดลงตามเวลา")\nplt.xlabel("Epoch")\nplt.ylabel("Loss")\nplt.grid(True, alpha=0.3)\nplt.show()'
      },
      {
        type: 'code',
        code: '# ทดสอบโมเดล\nprint("ผลลัพธ์โมเดล:")\nh = sigmoid(X @ W1)\nfinal = sigmoid(h @ W2)\nfor i in range(4):\n    pred = 1 if final[i][0] > 0.5 else 0\n    print(f"  {X[i]} → ทำนาย {pred} (จริง {y[i][0]}) — confidence {final[i][0]:.3f}")\n\nprint("\\n🎉 NN เรียนรู้ XOR ได้แล้ว!")'
      }
    ]
  },

  // ============ DATA: Image ============
  {
    key: 'images',
    level: 'AI',
    icon: '🖼️',
    name: 'จัดการรูปภาพ',
    desc: 'อ่าน/แก้ไข/วิเคราะห์รูป',
    cells: [
      {
        type: 'md',
        code: '# 🖼️ จัดการรูปภาพด้วย Python\nรูปภาพคือ matrix ของตัวเลข! เราจะใช้ Pillow + NumPy เปลี่ยนสีและสร้างรูป'
      },
      {
        type: 'code',
        code: 'import micropip\nawait micropip.install("pillow")\nprint("✅ พร้อม!")'
      },
      {
        type: 'code',
        code: 'import numpy as np\nimport matplotlib.pyplot as plt\n\n# สร้างรูป gradient ด้วย NumPy\nh, w = 100, 200\nimg = np.zeros((h, w, 3), dtype=np.uint8)\n\nfor y in range(h):\n    for x in range(w):\n        img[y, x, 0] = int(x / w * 255)  # Red\n        img[y, x, 1] = int(y / h * 255)  # Green\n        img[y, x, 2] = 128                # Blue\n\nplt.figure(figsize=(8, 4))\nplt.imshow(img)\nplt.title("Gradient (สร้างจาก NumPy)")\nplt.axis("off")\nplt.show()\n\nprint(f"ขนาดรูป: {img.shape}")\nprint(f"แต่ละ pixel มี 3 ค่า: R, G, B")'
      },
      {
        type: 'code',
        code: 'import numpy as np\nimport matplotlib.pyplot as plt\n\n# สร้างรูปวงกลม\nsize = 200\ny, x = np.ogrid[-size/2:size/2, -size/2:size/2]\ncircle = x**2 + y**2 <= (size/3)**2\n\nimg = np.zeros((size, size, 3), dtype=np.uint8)\nimg[circle] = [124, 58, 237]  # สีม่วง\nimg[~circle] = [240, 240, 250]  # สีเทาอ่อน\n\nplt.figure(figsize=(5, 5))\nplt.imshow(img)\nplt.axis("off")\nplt.title("วงกลมที่วาดจาก NumPy")\nplt.show()'
      }
    ]
  },

];
