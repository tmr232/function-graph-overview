public static string Replace(string s, string oldStr, string newStr, int n) {
    if (oldStr == newStr || n == 0) {
        return s;
    }

    int m = CountOccurrences(s, oldStr);
    if (m == 0) {
        return s;
    } else if (n < 0 || m < n) {
        n = m;
    }

    var b = new StringBuilder(s.Length + n * (newStr.Length - oldStr.Length));
    int start = 0;
    for (int i = 0; i < n; i++) {
        int j = s.IndexOf(oldStr, start);
        if (j < 0) {
            break;
        }
        b.Append(s, start, j - start);
        b.Append(newStr);
        start = j + oldStr.Length;
    }
    b.Append(s.Substring(start));
    return b.ToString();
}
