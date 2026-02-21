public static String replace(String s, String oldStr, String newStr, int n) {
    if (oldStr.equals(newStr) || n == 0) {
        return s;
    }

    int m = countOccurrences(s, oldStr);
    if (m == 0) {
        return s;
    } else if (n < 0 || m < n) {
        n = m;
    }

    StringBuilder b = new StringBuilder(s.length() + n * (newStr.length() - oldStr.length()));
    int start = 0;
    for (int i = 0; i < n; i++) {
        int j = s.indexOf(oldStr, start);
        if (j < 0) {
            break;
        }
        b.append(s, start, j);
        b.append(newStr);
        start = j + oldStr.length();
    }
    b.append(s.substring(start));
    return b.toString();
}
