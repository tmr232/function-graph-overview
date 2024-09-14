def f():
    try:
        linux_interaction()
    except RuntimeError as error:
        print(error)
    else:
        try:
            with open("file.log") as file:
                read_data = file.read()
        except FileNotFoundError as fnf_error:
            print(fnf_error)
    finally:
        print("Cleaning up, irrespective of any exceptions.")
