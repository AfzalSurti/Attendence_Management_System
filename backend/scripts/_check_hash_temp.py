import bcrypt

candidates = ["Admin@123", "Dev@123", "admin", "password", "123456", "Admin123", "Dev123"]

for h in [
    "$2b$12$X8M6J1c7fxMcC3JJXvAJP.POuId25Tt9LY5BiwKtyoGDtq8Pmumpm",
    "$2b$12$X8M6J1c7fxMcC3JJXvAJP.POuId25Tt9LY5BiwKtyoGDtq8Bmumpm",
]:
    print("Hash:", h[-20:])
    for c in candidates:
        ok = bcrypt.checkpw(c.encode(), h.encode())
        if ok:
            print(f"  MATCH: {c}")
