import io
import pathlib
import tarfile
import tempfile
import unittest
from toolchain import select_version, unpack


class ToolchainSecurityTests(unittest.TestCase):
    def test_exact_version_and_major_selection(self):
        versions = ["1.25.0", "1.25.9", "1.25.10", "1.26.1"]
        self.assertEqual(select_version(versions, "1.25.0"), "1.25.0")
        self.assertEqual(select_version(versions, "1.25"), "1.25.10")
        with self.assertRaises(ValueError):
            select_version(versions, "1.25;echo unsafe")
        with self.assertRaises(ValueError):
            select_version(versions, "1.25.99")

    def test_reject_archive_traversal_and_escaping_symlink(self):
        for symlink in (False, True):
            with self.subTest(symlink=symlink), tempfile.TemporaryDirectory() as tmp:
                root = pathlib.Path(tmp)
                archive = root / "test.tar.gz"
                with tarfile.open(archive, "w:gz") as tar:
                    entry = tarfile.TarInfo("escape" if symlink else "../escape")
                    if symlink:
                        entry.type = tarfile.SYMTYPE
                        entry.linkname = "../outside"
                    tar.addfile(entry, io.BytesIO())
                with self.assertRaises(tarfile.FilterError):
                    unpack(archive, root / "dest")
                self.assertFalse((root / "escape").exists())


if __name__ == "__main__":
    unittest.main()
