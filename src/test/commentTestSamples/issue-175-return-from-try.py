# exits: 4
def lookup_type(name):
	try:
		return gdb.lookup_type(name)
	except gdb.error:
		pass
	try:
		return gdb.lookup_type('struct ' + name)
	except gdb.error:
		pass
	try:
		return gdb.lookup_type('struct ' + name[1:]).pointer()
	except gdb.error:
		pass