package main

import (
	"flag"
	"github.com/deervery/furubira-kanko-official/internal/sitegen"
	"log"
)

func main() {
	root := flag.String("root", ".", "project root")
	flag.Parse()
	if err := sitegen.Build(*root); err != nil {
		log.Fatal(err)
	}
}
